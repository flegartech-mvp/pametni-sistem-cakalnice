import { chromium, expect } from "@playwright/test";

const appUrl = "http://127.0.0.1:5173";

const ensureDevServer = async () => {
  try {
    const response = await fetch(`${appUrl}/login`);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(
      `Dev server is not reachable at ${appUrl}. Start it with "npm run dev" before running this helper. ${error.message}`,
    );
  }
};

const seriousMessages = (page) => {
  const messages = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      messages.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    messages.push(error.message);
  });

  return messages;
};

const runStep = async (results, page, name, fn) => {
  const before = results.length;
  await fn();
  results.splice(before, 0, { step: name, status: "OK" });
};

const loginWithDemoData = async (page) => {
  await page.goto(`${appUrl}/login`);
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: /demo/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

await ensureDevServer();

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const consoleErrors = seriousMessages(page);
const results = [];

try {
  await runStep(results, page, "demo login", async () => {
    await loginWithDemoData(page);
    const state = await page.evaluate(() => {
      const patients = JSON.parse(localStorage.getItem("cakalnica:patients") || "[]");
      return {
        path: location.pathname,
        user: JSON.parse(localStorage.getItem("cakalnica:user") || "null")?.role,
        patients: patients.length,
      };
    });

    expect(state.path).toBe("/dashboard");
    expect(state.user).toBe("Administrator");
    expect(state.patients).toBeGreaterThanOrEqual(10);
  });

  await runStep(results, page, "patient validation and CRUD", async () => {
    await page.goto(`${appUrl}/patients/new`);
    await page.getByRole("button", { name: /^dodaj pacienta$/i }).click();
    await expect(page.locator("input:invalid").first()).toBeVisible();

    await page.getByLabel(/zacetnice|začetnice/i).fill("QA");
    await page.getByLabel(/leto rojstva/i).fill("1995");
    await page.getByLabel(/operativna opomba/i).fill("Interactive smoke");
    await page.getByLabel(/po shranjevanju/i).uncheck();
    await page.getByRole("button", { name: /^dodaj pacienta$/i }).click();
    await expect(page).toHaveURL(/\/patients$/);

    await page.getByPlaceholder(/isci|išči/i).fill("QA");
    await expect(page.locator(".table-panel")).toContainText("QA");

    const createdNumber = await page.evaluate(() => {
      const patients = JSON.parse(localStorage.getItem("cakalnica:patients") || "[]");
      return patients.find((item) => item.initials === "QA")?.number;
    });

    expect(createdNumber).toBeTruthy();

    await page
      .getByRole("button", {
        name: new RegExp(`${createdNumber}.*zaklju|zaklju.*${createdNumber}`, "i"),
      })
      .click();
    await page.getByRole("button", { name: /oznaci zakljuceno|označi zaključeno/i }).click();

    await page
      .getByRole("button", { name: new RegExp(`odstrani.*${createdNumber}`, "i") })
      .click();
    await page.getByRole("button", { name: /^odstrani pacienta$/i }).click();
    await expect(page.locator(".table-panel")).toContainText(/ni zadetkov/i);
  });

  await runStep(results, page, "queues and QR status", async () => {
    await page.goto(`${appUrl}/queues`);
    await page
      .locator(".queue-column")
      .filter({ hasText: /urgentni center/i })
      .getByRole("button", { name: /poklici|pokliči/i })
      .click();

    await page.goto(`${appUrl}/patient/p-u-001/status`);
    await expect(page.locator("body")).toContainText(/poklicani ste/i);
  });

  await runStep(results, page, "reports export and settings reset", async () => {
    await page.goto(`${appUrl}/reports`);
    await page.getByRole("button", { name: /izvozi csv/i }).click();
    await expect(page.locator("body")).toContainText(/porocila|poročila/i);

    await page.goto(`${appUrl}/settings`);
    await page.getByLabel(/naziv ustanove/i).fill("Demo zdravstveni center QA");
    await page.getByRole("button", { name: /shrani nastavitve/i }).click();
    await expect(page.locator(".toast-region")).toContainText(/nastavitve/i);

    await page.reload();
    await expect(page.getByLabel(/naziv ustanove/i)).toHaveValue(
      "Demo zdravstveni center QA",
    );
    await page.getByRole("button", { name: /demo podatke/i }).click();
    await expect(page.getByLabel(/naziv ustanove/i)).toHaveValue(
      "Demo zdravstveni center",
    );
  });

  await runStep(results, page, "reload persistence and mobile layout", async () => {
    await page.reload();
    await expect(page).toHaveURL(/\/settings$/);

    const persisted = await page.evaluate(() => ({
      user: JSON.parse(localStorage.getItem("cakalnica:user") || "null")?.role,
      patients: JSON.parse(localStorage.getItem("cakalnica:patients") || "[]").length,
    }));

    expect(persisted.user).toBe("Administrator");
    expect(persisted.patients).toBeGreaterThanOrEqual(10);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${appUrl}/dashboard`);
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(2);
  });

  expect(consoleErrors).toEqual([]);
} finally {
  await browser.close();
}

console.table(results);
