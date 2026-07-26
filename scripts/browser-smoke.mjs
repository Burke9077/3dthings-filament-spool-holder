import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import puppeteer from "puppeteer-core";

const host = "127.0.0.1";
const port = 4173;
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
  await page.goto(siteUrl, { waitUntil: "networkidle0" });
  await page.waitForSelector("#download-part-button");
  await page.waitForSelector("#print-guide");

  const state = await page.evaluate(() => window.__spoolCustomizer.getState());
  if (state.holderCount !== 2 || state.spoolDiameter !== 220) {
    throw new Error(`Unexpected initial state: ${JSON.stringify(state)}`);
  }

  const pageContent = await page.evaluate(() => ({
    bundleCount: document.querySelectorAll("[data-bundle]").length,
    linkKitDescription:
      document.querySelector("#link-kit-description")?.textContent,
    guideText: document.querySelector("#print-guide")?.textContent,
  }));
  if (
    pageContent.bundleCount !== 4 ||
    !pageContent.linkKitDescription?.includes("2 clips") ||
    !pageContent.guideText?.includes("Capture the four M3 nuts")
  ) {
    throw new Error(`Print guide is incomplete: ${JSON.stringify(pageContent)}`);
  }

  await page.evaluate(() => {
    document.querySelector('input[name="holderCount"][value="3"]').click();
  });
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

  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await page.click("#preview-button");
  await page.waitForFunction(
    () =>
      document.querySelector("#viewer-placeholder")?.classList.contains("hidden") &&
      document.querySelector("#viewer canvas"),
    { timeout: 30_000 },
  );
  const previewStatus = await page.$eval(
    "#generation-status",
    (element) => element.textContent,
  );
  if (!previewStatus.includes("3D preview ready")) {
    throw new Error(`Interactive preview did not finish: ${previewStatus}`);
  }

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
