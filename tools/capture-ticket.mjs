import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = resolve("screenshots", "qa");
const userDataDir = resolve("screenshots", ".ticket-chrome-profile");
const port = 9444;

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
        if (message.error) rejectCommand(new Error(message.error.message));
        else resolveCommand(message.result);
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
    <title>Listek L-004</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        background: #f3f7fb;
        color: #111827;
        font-family: Arial, sans-serif;
      }
      .ticket {
        width: 380px;
        margin: 0 auto;
        padding: 26px;
        border: 1px solid #d1d5db;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.14);
      }
      h1 { margin: 0 0 8px; font-size: 20px; }
      .muted, .note { color: #4b5563; font-size: 13px; }
      .number {
        margin: 20px 0;
        color: #071522;
        font-size: 48px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-top: 1px solid #e5e7eb;
        padding: 11px 0;
      }
      .row strong { text-align: right; }
      .link-box {
        margin-top: 15px;
        padding: 13px;
        border: 1px dashed #93c5fd;
        border-radius: 10px;
        background: #eff6ff;
      }
      .qr {
        display: grid;
        width: 108px;
        height: 108px;
        margin: 12px auto 4px;
        place-items: center;
        border: 8px solid #fff;
        background:
          linear-gradient(90deg, #111827 10px, transparent 10px) 0 0 / 22px 22px,
          linear-gradient(#111827 10px, transparent 10px) 0 0 / 22px 22px,
          #fff;
        box-shadow: 0 0 0 1px #cbd5e1;
      }
      .url { margin-top: 10px; color: #1d4ed8; font-size: 12px; word-break: break-all; }
      .note { margin: 16px 0 0; line-height: 1.45; }
    </style>
  </head>
  <body>
    <main class="ticket">
      <h1>Demo zdravstveni center</h1>
      <div class="muted">Informativni listek za čakalnico</div>
      <div class="number">L-004</div>
      <div class="row"><span>Usmeritev</span><strong>Laboratorij</strong></div>
      <div class="row"><span>Status</span><strong>Čaka na odvzem</strong></div>
      <div class="row"><span>Soba</span><strong>Lab 1</strong></div>
      <div class="row"><span>Prihod</span><strong>08:42</strong></div>
      <div class="link-box">
        <strong>QR/status povezava</strong>
        <div class="qr" aria-hidden="true"></div>
        <p class="url">http://127.0.0.1:5173/patient/p-l-004/status</p>
      </div>
      <p class="note">Prosimo, spremljajte javni prikazovalnik in QR status povezavo.</p>
      <p class="note">Sistem je demonstracijski prototip za komunikacijo v čakalnici. Ni namenjen medicinski diagnostiki in ne nadomešča uradnih zdravstvenih informacijskih sistemov ali eNaročanja.</p>
    </main>
  </body>
</html>`;

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
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 460,
    height: 920,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Page.navigate", {
    url: `data:text/html;charset=utf-8,${encodeURIComponent(ticketHtml)}`,
  });
  await sleep(700);
  await page.screenshot("patient-ticket.png");
  page.close();
} finally {
  await stopChromeProfile(chrome, ".ticket-chrome-profile");
}
