import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = "http://127.0.0.1:5173";
const outDir = resolve("screenshots");
const userDataDir = resolve("screenshots", ".chrome-profile");
const port = 9222;

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
};

const waitForChrome = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
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

      if (message.method) {
        const listeners = this.events.get(message.method) ?? [];
        for (const listener of listeners) {
          listener(message.params);
        }
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

  async navigate(path) {
    const load = this.waitFor("Page.loadEventFired");
    await this.send("Page.navigate", { url: `${appUrl}${path}` });
    await load;
    await sleep(650);
  }

  async screenshot(name, { width = 1440, height = 980, mobile = false } = {}) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile,
    });
    await sleep(250);
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

try {
  await waitForChrome();
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  });
  const page = new CdpPage(target.webSocketDebuggerUrl);
  await page.open();
  await page.send("Page.enable");
  await page.send("Runtime.enable");

  await page.navigate("/login");
  await page.screenshot("01-login-demo.png");
  await page.send("Runtime.evaluate", {
    expression: `
      localStorage.clear();
      localStorage.setItem("cakalnica:user", JSON.stringify({
        role: "Administrator",
        name: "Demo predstavitev"
      }));
    `,
  });

  const captures = [
    ["/dashboard", "02-dashboard.png"],
    ["/patients/new", "03-registracija-pacienta.png"],
    ["/queues", "04-cakalne-vrste.png"],
    ["/display", "05-javni-zaslon.png"],
    ["/patient/p-l-001/status", "06-status-qr.png"],
    ["/reports", "07-porocila-statistika.png"],
    ["/settings", "08-nastavitve.png"],
  ];

  for (const [path, file] of captures) {
    await page.navigate(path);
    await page.screenshot(file);
  }

  await page.navigate("/patients/new");
  await page.screenshot("09-mobilni-prikaz.png", {
    width: 390,
    height: 844,
    mobile: true,
  });

  page.close();
} finally {
  await stopChromeProfile(chrome, ".chrome-profile");
}
