import type { OpenAPIHono } from "@hono/zod-openapi";

type Document = ReturnType<OpenAPIHono["getOpenAPI31Document"]>;
type Definition = OpenAPIHono["openAPIRegistry"]["definitions"][number];
type RegisteredApp = {
  routes: readonly { method: string; path: string }[];
  openAPIRegistry: { definitions: readonly Definition[] };
};
const methods = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
] as const;

/** Only non-product infrastructure and intentionally denied legacy entrypoints are exempt. */
export const openApiExclusions: Readonly<Record<string, string>> = {
  "ALL /*":
    "Global request logging, write protection and same-origin middleware; not an endpoint.",
  "ALL /admin/teams/*":
    "Administrator response cache middleware; concrete endpoints are audited separately.",
  "ALL /auth/*":
    "Canonicalization and deny-by-default Better Auth fallback; concrete controlled endpoints require contracts.",
  "GET /docs": "Documentation HTML bootstrap; excluded from its own document.",
  "GET /openapi.json":
    "Generated public specification; excluded from its own document.",
  "GET /admin/docs":
    "Protected documentation HTML bootstrap; excluded from its own document.",
  "GET /admin/openapi.json":
    "Protected specification; excluded from its own document.",
  "GET /r2/*": "Local-only object fixture access; not a deployed product API.",
  "GET /proxy-image":
    "Internal allowlisted raster image proxy used by rendering.",
  "POST /auth/update-user":
    "Retired Better Auth endpoint deliberately returns 404; profile mutations use the controlled users API.",
  "POST /auth/request-password-reset":
    "Retired reset endpoint deliberately returns 404; controlled reset flow uses fragment tokens.",
  "GET /auth/verify-email":
    "Retired query-token endpoint deliberately returns 404; email confirmation uses a controlled POST body.",
  "POST /auth/verify-email":
    "Retired Better Auth endpoint deliberately returns 404; email confirmation uses a controlled POST body.",
};

function pathKey(path: string) {
  return (
    (path === "*" ? "/*" : path.replace(/:([A-Za-z0-9_]+)/gu, "{$1}")).replace(
      /\/$/u,
      "",
    ) || "/"
  );
}
function operationKey(method: string, path: string) {
  return `${method.toUpperCase()} ${pathKey(path)}`;
}

function resolvePointer(document: Document, pointer: string): unknown {
  let value: unknown = document;
  for (const encoded of pointer.slice(2).split("/")) {
    const key = decodeURIComponent(encoded)
      .replace(/~1/gu, "/")
      .replace(/~0/gu, "~");
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
      return undefined;
    value = Reflect.get(value, key);
  }
  return value;
}

/** Validate the generated artifact itself, including audience-filtered documents. */
export function assertOpenApiDocument(document: Document) {
  const ids = new Set<string>();
  const errors: string[] = [];
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const method of methods) {
      const operation = item?.[method];
      if (!operation) continue;
      const key = operationKey(method, path);
      if (!operation.operationId) errors.push(`Missing operationId: ${key}`);
      else if (ids.has(operation.operationId))
        errors.push(`Duplicate operationId: ${operation.operationId}`);
      else ids.add(operation.operationId);
      const audience = operation["x-audience"];
      if (
        !["public", "admin", "platform", "excluded"].includes(String(audience))
      )
        errors.push(`Unclassified operation: ${key}`);
      if (audience === "excluded" && !operation["x-exclusion-reason"])
        errors.push(`Missing exclusion reason: ${key}`);
      if (!operation.responses || Object.keys(operation.responses).length === 0)
        errors.push(`Missing responses: ${key}`);
      for (const [status, response] of Object.entries(
        operation.responses ?? {},
      )) {
        if (
          !("$ref" in response) &&
          response.content?.["application/json"] &&
          !response.content["application/json"].schema
        ) {
          errors.push(`Missing JSON response schema: ${key} ${status}`);
        }
      }
    }
  }
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") {
        if (
          !child.startsWith("#/") ||
          resolvePointer(document, child) === undefined
        )
          errors.push(`Unresolved schema reference: ${child}`);
      } else if (key === "security" && Array.isArray(child)) {
        for (const requirement of child) {
          for (const name of Object.keys(requirement)) {
            if (
              !Object.hasOwn(document.components?.securitySchemes ?? {}, name)
            )
              errors.push(`Missing security scheme: ${name}`);
          }
        }
      } else visit(child);
    }
  };
  visit(document);
  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
}

/** Compare real router registrations with the single contract registry, not a second endpoint inventory. */
export function assertOpenApiCoverage(app: RegisteredApp, document: Document) {
  assertOpenApiDocument(document);
  const documented = new Set<string>();
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const method of methods)
      if (item?.[method]) documented.add(operationKey(method, path));
  }
  const errors: string[] = [];
  const registry = new Set<string>();
  const excludedRegistrations = new Map<string, string>();
  for (const definition of app.openAPIRegistry.definitions) {
    if (definition.type !== "route") continue;
    const key = operationKey(definition.route.method, definition.route.path);
    if (registry.has(key))
      errors.push(`Duplicate contract registration: ${key}`);
    registry.add(key);
    if (definition.route["x-audience"] === "excluded") {
      const reason = definition.route["x-exclusion-reason"];
      if (typeof reason !== "string" || !reason.trim())
        errors.push(`Missing exclusion reason: ${key}`);
      else excludedRegistrations.set(key, reason);
    }
  }
  // Hono records validation and route middleware under the same method/path as their endpoint.
  const actual = new Set(
    app.routes.map(({ method, path }) => operationKey(method, path)),
  );
  const excluded: Record<string, string> = {};
  for (const key of actual) {
    if (documented.has(key)) continue;
    const reason = excludedRegistrations.get(key) ?? openApiExclusions[key];
    if (reason) excluded[key] = reason;
    else errors.push(`Undocumented registered route: ${key}`);
  }
  for (const key of documented) {
    if (!actual.has(key))
      errors.push(`Contract without a registered route: ${key}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { operations: documented.size, excluded };
}
