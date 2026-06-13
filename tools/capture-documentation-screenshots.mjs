import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = "http://127.0.0.1:5173";
const outDir = resolve("docs", "screenshots");
const userDataDir = resolve(".tmp", "doc-screenshot-chrome-profile");
const port = 9555;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
};

const ensureDevServer = async () => {
  try {
    const response = await fetch(`${appUrl}/login`);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(
      `Dev server ni dosegljiv na ${appUrl}. Pred zajemom zaženite "npm run dev". ${error.message}`,
    );
  }
};

const waitForChrome = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(150);
    }
  }
  throw new Error("Chrome debugging endpoint se ni zagnal.");
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
    await sleep(650);
  }

  async navigateRaw(url) {
    const load = this.waitFor("Page.loadEventFired");
    await this.send("Page.navigate", { url });
    await load;
    await sleep(650);
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

const ticketHtml = `<!doctype html>
<html lang="sl">
<head>
  <meta charset="utf-8" />
  <title>Pacientov listek</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #eef5f3;
      color: #10231f;
      font-family: Georgia, "Times New Roman", serif;
    }
    .listek {
      width: 430px;
      padding: 30px;
      border: 1px solid #b7c8c2;
      background: #fffdf8;
      box-shadow: 0 24px 60px rgba(16, 35, 31, 0.16);
    }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .podnaslov { color: #52635e; font-size: 14px; }
    .stevilka { margin: 22px 0; font-size: 60px; font-weight: 800; letter-spacing: 0; }
    .vrstica {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #d7e0dd;
      padding: 12px 0;
      gap: 20px;
    }
    .vrstica strong { text-align: right; }
    .qr {
      width: 126px;
      height: 126px;
      margin: 18px auto 8px;
      background:
        linear-gradient(90deg, #10231f 12px, transparent 12px) 0 0 / 24px 24px,
        linear-gradient(#10231f 12px, transparent 12px) 0 0 / 24px 24px,
        #fffdf8;
      border: 10px solid #fffdf8;
      box-shadow: 0 0 0 1px #b7c8c2;
    }
    .url { color: #0f766e; font-size: 12px; overflow-wrap: anywhere; text-align: center; }
    .opomba { margin: 16px 0 0; color: #52635e; font-size: 14px; line-height: 1.45; }
  </style>
</head>
<body>
  <main class="listek">
    <h1>Demo zdravstveni center</h1>
    <div class="podnaslov">Informativni listek za čakalnico</div>
    <div class="stevilka">L-004</div>
    <div class="vrstica"><span>Oddelek</span><strong>Laboratorij</strong></div>
    <div class="vrstica"><span>Status</span><strong>Čaka na odvzem</strong></div>
    <div class="vrstica"><span>Soba</span><strong>Lab 1</strong></div>
    <div class="vrstica"><span>Čas prihoda</span><strong>08:42</strong></div>
    <div class="qr" aria-hidden="true"></div>
    <p class="url">http://127.0.0.1:5173/patient/p-l-004/status</p>
    <p class="opomba">Prosimo, spremljajte javni prikazovalnik in QR status povezavo. Prikaz je demo prototip in ne nadomešča uradnega zdravstvenega informacijskega sistema.</p>
  </main>
</body>
</html>`;

await ensureDevServer();
await mkdir(outDir, { recursive: true });
await rm(outDir, { recursive: true, force: true });
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

  await page.setViewport(1440, 960);
  await page.navigate("/login");
  await page.screenshot("01-login-demo.png");
  await page.evaluate(`
    localStorage.clear();
    localStorage.setItem("cakalnica:user", JSON.stringify({
      role: "Administrator",
      name: "Demo predstavitev"
    }));
  `);

  const desktopCaptures = [
    ["/dashboard", "02-dashboard.png"],
    ["/patients", "03-pacienti-seznam.png"],
    ["/patients/new", "04-registracija-pacienta.png"],
    ["/queues", "05-cakalne-vrste.png"],
    ["/display", "06-javni-zaslon.png"],
    ["/patient/p-l-001/status", "07-status-qr.png"],
    ["/reports", "08-porocila-statistika.png"],
    ["/settings", "09-nastavitve.png"],
  ];

  for (const [path, file] of desktopCaptures) {
    await page.setViewport(1440, 960);
    await page.navigate(path);
    await page.screenshot(file);
  }

  await page.setViewport(390, 844, true);
  await page.navigate("/patients");
  await page.screenshot("10-mobilni-prikaz.png");

  await page.setViewport(1920, 1080);
  await page.navigate("/display");
  await page.screenshot("11-tv-prikaz.png");

  await page.setViewport(520, 900);
  await page.navigateRaw(`data:text/html;charset=utf-8,${encodeURIComponent(ticketHtml)}`);
  await page.screenshot("12-pacientov-listek.png");

  page.close();
} finally {
  await stopChromeProfile(chrome, "doc-screenshot-chrome-profile");
}
