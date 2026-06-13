import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = "http://127.0.0.1:5173";
const outDir = resolve("screenshots", "qa");
const userDataDir = resolve("screenshots", ".qa-chrome-profile");
const port = 9333;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
};

const waitForChrome = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(150);
    }
  }
  throw new Error("Chrome debugging endpoint did not start.");
};

const stopChromeProfile = async (childProcess, profileMarker) => {
  if (process.platform === "win32") {
    if (childProcess.pid) {
      await new Promise((resolveStop) => {
        spawn("taskkill", ["/PID", String(childProcess.pid), "/T", "/F"], {
          stdio: "ignore",
        }).on("exit", resolveStop);
      });
    }

    await new Promise((resolveStop) => {
      const command = `Get-CimInstance Win32_Process -Filter "name = 'chrome.exe'" | Where-Object { $_.CommandLine -like '*${profileMarker}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
      spawn("powershell.exe", ["-NoProfile", "-Command", command], {
        stdio: "ignore",
      }).on("exit", resolveStop);
    });
    return;
  }

  childProcess.kill();
};

class CdpPage {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.errors = [];
  }

  async open() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.ws.addEventListener("open", resolveOpen, { once: true });
      this.ws.addEventListener("error", rejectOpen, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolveCommand, rejectCommand } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          rejectCommand(new Error(message.error.message));
        } else {
          resolveCommand(message.result);
        }
        return;
      }

      if (message.method === "Runtime.exceptionThrown") {
        this.errors.push(message.params.exceptionDetails.text);
      }

      if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
        this.errors.push(message.params.entry.text);
      }

      if (message.method) {
        const listeners = this.events.get(message.method) ?? [];
        for (const listener of listeners) listener(message.params);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, { resolveCommand, rejectCommand });
    });
  }

  waitFor(method) {
    return new Promise((resolveEvent) => {
      const listeners = this.events.get(method) ?? [];
      listeners.push(resolveEvent);
      this.events.set(method, listeners);
    });
  }

  async setViewport(width, height, mobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile,
    });
  }

  async navigate(path) {
    const load = this.waitFor("Page.loadEventFired");
    await this.send("Page.navigate", { url: `${appUrl}${path}` });
    await load;
    await sleep(550);
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    return result.result.value;
  }

  async screenshot(name) {
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await writeFile(join(outDir, name), Buffer.from(result.data, "base64"));
  }

  close() {
    this.ws.close();
  }
}

await mkdir(outDir, { recursive: true });
await rm(userDataDir, { recursive: true, force: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: "ignore" });

const results = [];

try {
  await waitForChrome();
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  });
  const page = new CdpPage(target.webSocketDebuggerUrl);
  await page.open();
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Log.enable");

  await page.navigate("/login");
  await page.evaluate(`
    localStorage.clear();
    localStorage.setItem("cakalnica:user", JSON.stringify({
      role: "Administrator",
      name: "Demo predstavitev"
    }));
  `);

  const pages = [
    ["/login", "login"],
    ["/dashboard", "dashboard"],
    ["/patients", "patients"],
    ["/patients/new", "add-patient"],
    ["/queues", "queues"],
    ["/display", "display"],
    ["/patient/p-l-001/status", "patient-status"],
    ["/reports", "reports"],
    ["/about", "about"],
    ["/settings", "settings"],
  ];

  const viewports = [
    ["desktop", 1440, 980, false],
    ["tablet-landscape", 1024, 768, false],
    ["tablet-portrait", 768, 1024, false],
    ["mobile", 390, 844, true],
  ];

  for (const [label, width, height, mobile] of viewports) {
    for (const [path, name] of pages) {
      page.errors = [];
      await page.setViewport(width, height, mobile);
      await page.navigate(path);
      const metrics = await page.evaluate(`(() => {
        const root = document.documentElement;
        const body = document.body;
        const overflowX = Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth;
        const clipped = [...document.querySelectorAll('body *')].filter((el) => {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.right > root.clientWidth + 2;
        }).slice(0, 5).map((el) => el.className || el.tagName);
        return { overflowX, clipped };
      })()`);
      await page.screenshot(`${label}-${name}.png`);
      results.push({
        viewport: label,
        page: name,
        overflowX: metrics.overflowX,
        clipped: metrics.clipped,
        errors: [...page.errors],
      });
    }
  }

  page.errors = [];
  await page.setViewport(1920, 1080, false);
  await page.navigate("/display");
  await page.screenshot("tv-display.png");
  const tvMetrics = await page.evaluate(`(() => {
    const root = document.documentElement;
    return { overflowX: document.body.scrollWidth - root.clientWidth };
  })()`);
  results.push({
    viewport: "tv",
    page: "display",
    overflowX: tvMetrics.overflowX,
    clipped: [],
    errors: [...page.errors],
  });

  page.close();
} finally {
  await stopChromeProfile(chrome, ".qa-chrome-profile");
}

console.table(results.map((item) => ({
  viewport: item.viewport,
  page: item.page,
  overflowX: item.overflowX,
  clipped: item.clipped.length,
  errors: item.errors.length,
})));

const failures = results.filter(
  (item) => item.overflowX > 2 || item.clipped.length || item.errors.length,
);

if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
