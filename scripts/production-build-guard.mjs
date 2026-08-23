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
 * Local builds may run without Workers CI metadata, but a Workers Build must
 * come from the production branch and select the production Cloudflare env.
 */
export function assertProductionBuildEnvironment(environment = process.env) {
  const selectedEnvironment = environment.CLOUDFLARE_ENV;
  if (
    selectedEnvironment &&
    selectedEnvironment !== PRODUCTION_ENVIRONMENT
  ) {
    throw new Error("生产构建只允许 CLOUDFLARE_ENV=production");
  }

  if (
    environment.WORKERS_CI === "1" &&
    environment.WORKERS_CI_BRANCH !== "main"
  ) {
    throw new Error("Workers Builds 只允许 main 分支进行生产构建");
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
