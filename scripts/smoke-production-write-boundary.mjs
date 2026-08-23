#!/usr/bin/env node

const productionUrl = (process.env.PRODUCTION_APP_URL || "https://gomate.live").replace(
  /\/$/u,
  "",
);

async function readJson(response) {
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // The assertion below reports the non-JSON response without exposing it.
  }
  return { status: response.status, headers: response.headers, body };
}

export function assertOpenWriteBoundary({ health, signup }) {
  const versionId = health.headers["x-worker-version-id"];
  if (
    health.status !== 200 ||
    health.body?.status !== "ok" ||
    health.body?.writeMode !== "open"
  ) {
    throw new Error("生产 smoke 失败：/api/health 必须报告 writeMode=open");
  }
  if (!versionId || health.body.versionId !== versionId) {
    throw new Error("生产 smoke 失败：health version ID 不一致");
  }
  if (
    signup.status !== 400 ||
    signup.body?.error?.code !== "VALIDATION_ERROR"
  ) {
    throw new Error(
      "生产 smoke 失败：注册边界未返回预期的无副作用参数错误",
    );
  }
}

async function main() {
  const healthResponse = await fetch(`${productionUrl}/api/health`);
  const healthJson = await readJson(healthResponse);
  const health = {
    ...healthJson,
    headers: {
      "x-worker-version-id": healthResponse.headers.get("x-worker-version-id"),
    },
  };
  const signupResponse = await fetch(`${productionUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const signup = await readJson(signupResponse);

  assertOpenWriteBoundary({ health, signup });
  console.log(JSON.stringify({
    status: "ok",
    writeMode: health.body.writeMode,
    versionId: health.headers["x-worker-version-id"],
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  });
}
