export const PRODUCTION_ENVIRONMENT = "production";

export function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/^\s*\/\/.*$/gmu, "")
      .replace(/,\s*([}\]])/gu, "$1"),
  );
}

export function assertProductionWriteMode(environment = process.env) {
  if (environment.WRITE_MODE !== "open") {
    throw new Error("正常生产部署必须使用 WRITE_MODE=open");
  }
}

/**
 * Keep the one-environment release policy fail-closed in Workers Builds.
 * Local builds may run without Workers CI metadata, while both production and
 * non-production branches build against the production-compatible Worker env.
 */
export function assertProductionBuildEnvironment(environment = process.env) {
  const selectedEnvironment = environment.CLOUDFLARE_ENV;
  if (
    selectedEnvironment &&
    selectedEnvironment !== PRODUCTION_ENVIRONMENT
  ) {
    throw new Error("生产构建只允许 CLOUDFLARE_ENV=production");
  }
}

export function assertPreviewDeployEnvironment(environment = process.env) {
  const selectedEnvironment = environment.CLOUDFLARE_ENV;
  if (
    selectedEnvironment &&
    selectedEnvironment !== PRODUCTION_ENVIRONMENT
  ) {
    throw new Error("Preview 构建只允许 CLOUDFLARE_ENV=production");
  }
  if (environment.WORKERS_CI !== "1") {
    throw new Error("Preview 部署只允许由 Workers Builds 执行");
  }
  if (!environment.WORKERS_CI_BRANCH) {
    throw new Error("Preview 部署缺少 WORKERS_CI_BRANCH");
  }
  if (environment.WORKERS_CI_BRANCH === "main") {
    throw new Error("Preview 部署不允许使用 main 分支");
  }
}

export function assertProductionDeployEnvironment(environment = process.env) {
  assertProductionBuildEnvironment(environment);
  if (
    environment.WORKERS_CI !== "1" ||
    environment.WORKERS_CI_BRANCH !== "main"
  ) {
    throw new Error("生产部署只允许由 main 分支的 Workers Builds 执行");
  }
}
