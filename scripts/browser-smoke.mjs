import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import puppeteer from "puppeteer-core";

const host = "127.0.0.1";
const port = 4173;
const previewTimeoutMs = 60_000;
const siteUrl =
  `http://${host}:${port}/3dthings-filament-spool-holder/`;
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
].filter(Boolean);

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function findChrome() {
  const { access } = await import("node:fs/promises");
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common executable.
    }
  }
  throw new Error(
    "Chrome was not found. Set CHROME_BIN to run the browser smoke test.",
  );
}

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    host,
    "--port",
    String(port),
    "--strictPort",
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let browser;
try {
  await Promise.race([
    waitForServer(siteUrl),
    once(server, "exit").then(([code]) => {
      throw new Error(`Vite preview exited early with code ${code}`);
    }),
  ]);

  browser = await puppeteer.launch({
    executablePath: await findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  const failures = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    failures.push(
      `request: ${request.url()} (${request.failure()?.errorText})`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`response: ${response.status()} ${response.url()}`);
    }
  });

  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await page.goto(siteUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForSelector("#download-part-button");
  await page.waitForSelector("#print-guide");
  await page.waitForFunction(
    () =>
      document.querySelector("#viewer")?.dataset.previewState === "ready" &&
      document.querySelector("#viewer canvas") &&
      window.__spoolCustomizer.getPreviewState()?.holderCount === 2,
    { timeout: previewTimeoutMs },
  );

  const state = await page.evaluate(() => window.__spoolCustomizer.getState());
  if (state.holderCount !== 2 || state.spoolDiameter !== 220) {
    throw new Error(`Unexpected initial state: ${JSON.stringify(state)}`);
  }

  const pageContent = await page.evaluate(() => ({
    bundleCount: document.querySelectorAll("[data-bundle]").length,
    linkKitDescription:
      document.querySelector("#link-kit-description")?.textContent,
    guideText: document.querySelector("#print-guide")?.textContent,
    fitLabel: document.querySelector('label[for="fit-preset"]')?.textContent,
    fitHelp: document.querySelector("#fit-preset-summary")?.parentElement?.textContent,
    previewButtonCount: document.querySelectorAll("#preview-button").length,
  }));
  if (
    pageContent.bundleCount !== 4 ||
    !pageContent.linkKitDescription?.includes("2 clips") ||
    !pageContent.guideText?.includes("Capture the four M3 nuts") ||
    !pageContent.fitLabel?.includes("Part-fit clearance") ||
    !pageContent.fitHelp?.includes("rail sockets") ||
    pageContent.previewButtonCount !== 0
  ) {
    throw new Error(`Page UX is incomplete: ${JSON.stringify(pageContent)}`);
  }

  await page.select("#fit-preset", "loose");
  const extraClearance = await page.evaluate(() => ({
    state: window.__spoolCustomizer.getState(),
    summary: document.querySelector("#fit-preset-summary")?.textContent,
  }));
  if (
    extraClearance.state.fitPreset !== "loose" ||
    extraClearance.state.railFitClearance !== 0.45 ||
    !extraClearance.summary?.includes("Extra clearance")
  ) {
    throw new Error(
      `Fit preset did not apply clearly: ${JSON.stringify(extraClearance)}`,
    );
  }
  await page.select("#fit-preset", "standard");

  await page.evaluate(() => {
    document.querySelector('input[name="holderCount"][value="3"]').click();
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#viewer")?.dataset.previewState === "ready" &&
      window.__spoolCustomizer.getPreviewState()?.holderCount === 3,
    { timeout: previewTimeoutMs },
  );
  const threeHolderDescription = await page.$eval(
    "#link-kit-description",
    (element) => element.textContent,
  );
  if (!threeHolderDescription.includes("4 clips for 3 holders")) {
    throw new Error(`Bundle quantity did not update: ${threeHolderDescription}`);
  }
  await page.evaluate(() => {
    document.querySelector('input[name="holderCount"][value="2"]').click();
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#viewer")?.dataset.previewState === "ready" &&
      window.__spoolCustomizer.getPreviewState()?.holderCount === 2,
    { timeout: previewTimeoutMs },
  );

  const byteLength = await page.evaluate(
    () => window.__spoolCustomizer.generateByteLength("nut_fit_test"),
  );
  if (byteLength <= 84) {
    throw new Error(`Generated STL is unexpectedly small: ${byteLength}`);
  }

  await mkdir("build", { recursive: true });
  await page.screenshot({
    path: "build/site-smoke.png",
    fullPage: true,
  });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (hasHorizontalOverflow) {
    throw new Error("Mobile layout has horizontal overflow.");
  }
  await page.screenshot({
    path: "build/site-mobile-smoke.png",
    fullPage: true,
  });

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  process.stdout.write(
    `Browser smoke test passed; generated ${byteLength} STL bytes.\n`,
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}
