/* global window, document */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Controlled local measurements, not field Core Web Vitals or device certification.
const origin = process.env.PERF_ORIGIN ?? "http://127.0.0.1:5439";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) {
  throw new Error("Performance fixtures must use an isolated local server");
}
const output = process.argv[2] ?? ".lighthouseci/performance.json";
const location = (await (await fetch(`${origin}/api/locations?limit=1`)).json()).locations[0];
const team = (await (await fetch(`${origin}/api/teams?limit=1`)).json()).teams[0];
const routes = ["/", "/locations", "/teams", "/privacy", ...(location ? [`/locations/${location.id}`] : []), ...(team ? [`/teams/${team.id}`] : [])];
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const route of routes) {
      for (let sample = 0; sample < 3; sample++) {
        const context = await browser.newContext({ viewport, locale: "zh-CN" });
        await context.addCookies([{ name: "gomate_locale", value: "zh-CN", url: origin }]);
        // Fix external image bytes across runs; this isolates application work.
        await context.route(/^https:\/\//, (request) => request.request().resourceType() === "image"
          ? request.fulfill({ path: "public/images/footer-landscape-small.webp", contentType: "image/webp" })
          : request.abort());
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const session = await context.newCDPSession(page);
        await session.send("Network.enable");
        await session.send("Network.setCacheDisabled", { cacheDisabled: true });
        await session.send("Network.emulateNetworkConditions", { offline: false, latency: 80, downloadThroughput: 200000, uploadThroughput: 100000 });
        await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.addInitScript(() => {
          window.__perf = { lcp: 0, cls: 0, longTasks: 0, longestTask: 0 };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__perf.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__perf.cls += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__perf.longTasks++;
              window.__perf.longestTask = Math.max(window.__perf.longestTask, entry.duration);
            }
          }).observe({ type: "longtask", buffered: true });
        });
        const response = await page.goto(`${origin}${route}`, { waitUntil: "load" });
        if (!response?.ok() || (await response.text()).includes("/@vite/client")) {
          throw new Error(`Expected a successful built Worker response for ${route}`);
        }
        await page.waitForTimeout(2500);
        const metrics = await page.evaluate(() => ({
          ...window.__perf,
          ttfb: performance.getEntriesByType("navigation")[0].responseStart,
          resources: performance.getEntriesByType("resource").map((entry) => ({ url: entry.name, bytes: entry.encodedBodySize, duration: entry.duration })),
          headings: [...document.querySelectorAll("h1")].map((element) => element.textContent),
        }));
        results.push({ route, viewport, sample, ...metrics, errors });
        console.log(JSON.stringify({ route, width: viewport.width, sample, lcp: Math.round(metrics.lcp), cls: metrics.cls, errors: errors.length }));
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ conditions: { browser: "Chromium", cpuSlowdown: 4, latencyMs: 80, downloadBytesPerSecond: 200000, coldBrowserCache: true, externalImages: "fixed local 64 KiB WebP", samplesPerRoute: 3, observationAfterLoadMs: 2500, scope: "local load measurements; CLS is the sum in the bounded observation window, not field session-window CLS; no INP claim" }, results }, null, 2));
