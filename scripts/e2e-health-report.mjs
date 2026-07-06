#!/usr/bin/env node
/**
 * E2E 健康度报告生成器
 *
 * 解析 Playwright JSON report（e2e-report/results.json），
 * 输出本次运行的 flaky rate、failure rate、平均耗时、失败原因分布，
 * 并累积历史记录到 e2e-health-history.json。
 *
 * 在 CI 中于 E2E 任务后运行，无论测试是否失败都执行。
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPORT_PATH = "e2e-report/results.json";
const HEALTH_HISTORY_PATH = "e2e-health-history.json";
const HEALTH_REPORT_PATH = "e2e-health-report.json";

function toFixed2(n) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

async function main() {
  const now = new Date().toISOString();
  let suites = [];
  let reportExists = false;

  try {
    const raw = await readFile(REPORT_PATH, "utf-8");
    const report = JSON.parse(raw);
    suites = Array.isArray(report.suites) ? report.suites : [];
    reportExists = true;
  } catch (err) {
    console.warn(`[e2e-health-report] 无法读取 ${REPORT_PATH}: ${err.message}`);
  }

  // 统计
  let totalTests = 0;
  let expected = 0;
  let flaky = 0;
  let unexpected = 0;
  let skipped = 0;
  let totalDurationMs = 0;
  const failureReasons = [];

  for (const suite of suites) {
    const specs = Array.isArray(suite.specs) ? suite.specs : [];
    for (const spec of specs) {
      const tests = Array.isArray(spec.tests) ? spec.tests : [];
      for (const test of tests) {
        totalTests += 1;
        const results = Array.isArray(test.results) ? test.results : [];
        const status = test.expectedStatus === "skipped" ? "skipped" : test.ok ? "expected" : "unexpected";

        if (status === "skipped") {
          skipped += 1;
        } else if (test.outcome === "flaky") {
          flaky += 1;
          expected += 1; // flaky 最终通过
        } else if (test.ok) {
          expected += 1;
        } else {
          unexpected += 1;
        }

        for (const result of results) {
          totalDurationMs += result.duration || 0;
          if (result.status === "failed" && result.error?.message) {
            failureReasons.push(result.error.message);
          }
        }
      }
    }
  }

  const finishedTests = Math.max(totalTests - skipped, 1);
  const flakyRate = toFixed2((flaky / finishedTests) * 100);
  const failureRate = toFixed2((unexpected / finishedTests) * 100);
  const avgDurationSec = toFixed2(totalDurationMs / 1000 / Math.max(totalTests, 1));

  // 失败原因分类（简单前缀匹配）
  const failureCategories = {};
  for (const reason of failureReasons) {
    const key = reason.includes("timeout")
      ? "timeout"
      : reason.includes("selector")
        ? "selector-not-found"
        : reason.includes("navigation")
          ? "navigation"
          : "other";
    failureCategories[key] = (failureCategories[key] || 0) + 1;
  }

  const current = {
    date: now,
    reportExists,
    totalTests,
    expected,
    flaky,
    unexpected,
    skipped,
    flakyRate,
    failureRate,
    avgDurationSec,
    failureCategories,
    failureReasons: failureReasons.slice(0, 20), // 只保留前 20 条
  };

  // 历史记录
  let history = [];
  if (existsSync(HEALTH_HISTORY_PATH)) {
    try {
      const raw = await readFile(HEALTH_HISTORY_PATH, "utf-8");
      history = JSON.parse(raw);
      if (!Array.isArray(history)) history = [];
    } catch (err) {
      console.warn(`[e2e-health-report] 历史记录读取失败: ${err.message}`);
    }
  }
  history.push(current);
  if (history.length > 30) history = history.slice(-30); // 保留最近 30 次

  await writeFile(HEALTH_REPORT_PATH, JSON.stringify(current, null, 2), "utf-8");
  await writeFile(HEALTH_HISTORY_PATH, JSON.stringify(history, null, 2), "utf-8");

  console.log("[e2e-health-report] 当前报告:");
  console.log(`  totalTests: ${totalTests}`);
  console.log(`  expected: ${expected}, flaky: ${flaky}, unexpected: ${unexpected}, skipped: ${skipped}`);
  console.log(`  flakyRate: ${flakyRate}%`);
  console.log(`  failureRate: ${failureRate}%`);
  console.log(`  avgDurationSec: ${avgDurationSec}s`);
  console.log(`  failureCategories: ${JSON.stringify(failureCategories)}`);
}

main().catch((err) => {
  console.error(`[e2e-health-report] 生成失败: ${err.message}`);
  process.exit(1);
});
