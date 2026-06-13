import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const routes = [
  "/login",
  "/about",
  "/display",
  "/patient/p-l-001/status",
  "/dashboard",
  "/patients",
  "/patients/new",
  "/queues",
  "/reports",
  "/settings",
];

const seriousMessages = (page: Page) => {
  const messages: string[] = [];

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

const loginWithDemoData = async (page: Page) => {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: /demo/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(2);
};

const saveScreenshot = async (page: Page, projectName: string, name: string) => {
  const dir = join("output", "playwright", "smokebomb");
  await mkdir(dir, { recursive: true });
  await page.screenshot({
    path: join(dir, `${projectName}-${name}.png`),
    fullPage: false,
  });
};

test("app loads, auth flow works, and protected routes survive refresh", async ({
  page,
}, testInfo) => {
  const consoleErrors = seriousMessages(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /predstavitveni dostop/i })).toBeVisible();

  await loginWithDemoData(page);
  await expect(page.getByRole("heading", { name: /nadzorna/i })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectNoHorizontalOverflow(page);
  await saveScreenshot(page, testInfo.project.name, "dashboard");

  await page.getByRole("button", { name: /odjava/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(consoleErrors).toEqual([]);
});

test("main routes and navigation links render without serious console errors", async ({
  page,
}, testInfo) => {
  const consoleErrors = seriousMessages(page);

  await loginWithDemoData(page);

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("body")).not.toBeEmpty();
    await expectNoHorizontalOverflow(page);
  }

  await page.goto("/definitely-not-a-route");
  await expect(page).toHaveURL(/\/dashboard$/);

  const navTargets = [
    "/patients",
    "/patients/new",
    "/queues",
    "/reports",
    "/about",
    "/settings",
  ];

  for (const href of navTargets) {
    await page.goto("/dashboard");
    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${href.replace("/", "\\/")}$`));
  }

  await saveScreenshot(page, testInfo.project.name, "settings");
  expect(consoleErrors).toEqual([]);
});

test("patient CRUD, validation, search, queues, reports, and settings work", async ({
  page,
}, testInfo) => {
  const consoleErrors = seriousMessages(page);

  await loginWithDemoData(page);
  await page.goto("/patients/new");
  await page.getByRole("button", { name: /^dodaj pacienta$/i }).click();
  await expect(page.locator("input:invalid").first()).toBeVisible();

  await page.getByLabel(/zacetnice|začetnice/i).fill("QA");
  await page.getByLabel(/leto rojstva/i).fill("1995");
  await page.getByLabel(/operativna opomba/i).fill("Playwright smoke");
  await page.getByLabel(/po shranjevanju/i).uncheck();
  await page.getByRole("button", { name: /^dodaj pacienta$/i }).click();
  await expect(page).toHaveURL(/\/patients$/);

  await page.getByPlaceholder(/isci|išči/i).fill("QA");
  await expect(page.locator(".table-panel")).toContainText("QA");

  const createdNumber = await page.evaluate(() => {
    const patients = JSON.parse(localStorage.getItem("cakalnica:patients") || "[]");
    const patient = patients.find((item: { initials?: string }) => item.initials === "QA");
    return patient?.number as string | undefined;
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

  await page.goto("/queues");
  await page.locator(".queue-column").filter({ hasText: /urgentni center/i }).getByRole("button", { name: /poklici|pokliči/i }).click();
  await page.goto("/patient/p-u-001/status");
  await expect(page.locator("body")).toContainText(/poklicani ste/i);

  await page.goto("/reports");
  await page.getByRole("button", { name: /izvozi csv/i }).click();
  await expect(page.locator("body")).toContainText(/porocila|poročila/i);

  await page.goto("/settings");
  await page.getByLabel(/naziv ustanove/i).fill("Demo zdravstveni center QA");
  await page.getByRole("button", { name: /shrani nastavitve/i }).click();
  await expect(page.locator(".toast-region")).toContainText(/nastavitve/i);

  await page.reload();
  await expect(page.getByLabel(/naziv ustanove/i)).toHaveValue("Demo zdravstveni center QA");
  await page.getByRole("button", { name: /demo podatke/i }).click();
  await expect(page.getByLabel(/naziv ustanove/i)).toHaveValue("Demo zdravstveni center");
  await saveScreenshot(page, testInfo.project.name, "flow-complete");

  expect(consoleErrors).toEqual([]);
});
