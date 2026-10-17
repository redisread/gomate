import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import * as schema from "./db/schema";
import { createApiApp, createRoute, jsonResponse, z } from "./lib/openapi";
import { registerDocumentation } from "./lib/api-documentation";
import {
  assertOpenApiCoverage,
  assertOpenApiDocument,
} from "./lib/openapi-coverage";

const mocks = vi.hoisted(() => ({ createDb: vi.fn(), getSession: vi.fn() }));
vi.mock("./db", () => ({ createDb: mocks.createDb }));
vi.mock("./lib/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.getSession } }),
}));
const { apiApp } = await import("./app");
type ApiBindings = import("./app").ApiBindings;
type Document = ReturnType<typeof apiApp.getOpenAPI31Document>;

function bindings(enabled = "true") {
  return {
    APP_URL: "https://gomate.live",
    PREVIEW_HOST_SUFFIX: "example.workers.dev",
    WRITE_MODE: "open",
    API_DOCS_ENABLED: enabled,
  } as unknown as ApiBindings;
}
async function request(path: string, host = "localhost", enabled = "true") {
  return apiApp.fetch(new Request(`https://${host}${path}`), bindings(enabled));
}
beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue(null);
  mocks.createDb.mockReset().mockImplementation(() => {
    throw new Error("Documentation unexpectedly used business bindings");
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("API documentation HTTP boundary", () => {
  it("serves a public OpenAPI contract without business bindings", async () => {
    const response = await request("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-cache");
    const spec: Document = await response.json();
    expect(spec).toMatchObject({
      openapi: "3.1.0",
      servers: [{ url: "/api" }],
    });
    expect(spec.paths?.["/locations"]?.get).toBeDefined();
    expect(spec.paths?.["/locations"]?.post).toBeUndefined();
    expect(spec.paths?.["/admin/users"]).toBeUndefined();
    expect(mocks.createDb).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
    assertOpenApiDocument(spec);
  });

  it.each(["/docs", "/openapi.json", "/admin/docs", "/admin/openapi.json"])(
    "disables %s without changing business health or doing authentication work",
    async (path) => {
      expect((await request(path, "localhost", "false")).status).toBe(404);
      expect((await request("/health", "localhost", "false")).status).toBe(200);
      expect(mocks.getSession).not.toHaveBeenCalled();
      expect(mocks.createDb).not.toHaveBeenCalled();
    },
  );

  it.each(["gomate.live", "build-gomate.example.workers.dev"])(
    "disables interactive requests on %s",
    async (host) => {
      const response = await request("/docs", host);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toMatch(/"hideTestRequestButton":\s*true/u);
      expect(html).toMatch(/"persistAuth":\s*false/u);
      expect(html).toMatch(/"proxyUrl":\s*""/u);
      expect(html).toContain("/generated/scalar-1.75.0/standalone.js");
      expect(html).toContain("/api/openapi.json");
      expect(html).not.toContain("cdn.jsdelivr.net");
    },
  );

  it.each([
    ["en-US,en;q=0.9", undefined, "GoMate API Reference"],
    ["ja-JP,ja;q=0.9", undefined, "GoMate API 文档"],
    ["en-US", "gomate_locale=zh-CN", "GoMate API 文档"],
  ])(
    "localizes the document title for %s with cookie %s",
    async (language, cookie, title) => {
      const headers = new Headers({ "accept-language": language! });
      if (cookie) headers.set("cookie", cookie);
      const response = await apiApp.fetch(
        new Request("https://localhost/docs", { headers }),
        bindings(),
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(`<title>${title}</title>`);
    },
  );

  it("allows local request controls while keeping the specification same-origin", async () => {
    const response = await request("/docs");
    const html = await response.text();
    expect(html).toMatch(/"hideTestRequestButton":\s*false/u);
    expect(html).toContain("/api/openapi.json");
  });

  it("documents global write protection without inventing GET failures", async () => {
    const spec: Document = await (await request("/openapi.json")).json();
    const write = spec.paths?.["/teams"]?.post;
    expect(write?.responses?.["403"]).toBeDefined();
    expect(write?.responses?.["503"]).toMatchObject({
      headers: { "Retry-After": expect.any(Object) },
    });
    expect(spec.paths?.["/teams"]?.get?.responses?.["503"]).toBeUndefined();
    expect(
      spec.paths?.["/auth/sign-in/email"]?.post?.responses?.["503"],
    ).toMatchObject({
      headers: { "Retry-After": expect.any(Object) },
      content: { "application/json": { schema: expect.any(Object) } },
    });
  });
});

const migrationRoot = new URL("../../migrations/", import.meta.url);
const migrations = readdirSync(migrationRoot)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationRoot), "utf8"));
let sqlite: DatabaseSync;

describe("administrator documentation access and complete coverage", () => {
  beforeEach(() => {
    sqlite = new DatabaseSync(":memory:");
    for (const migration of migrations)
      sqlite.exec(`BEGIN; PRAGMA defer_foreign_keys=ON; ${migration}; COMMIT;`);
    const db = drizzle(
      async (query, params, method) => {
        const statement = sqlite.prepare(query);
        statement.setReturnArrays(true);
        return {
          rows: (method === "get"
            ? statement.get(...params)
            : statement.all(...params)) as unknown as unknown[][],
        };
      },
      { schema },
    );
    mocks.createDb.mockReturnValue(db);
    sqlite.exec(`INSERT INTO users (id, name, email, role, status) VALUES
      ('admin', 'Admin', 'admin@example.com', 'admin', 'active'),
      ('user', 'User', 'user@example.com', 'user', 'active'),
      ('inactive', 'Inactive', 'inactive@example.com', 'admin', 'suspended');`);
  });
  afterEach(() => {
    sqlite.close();
  });

  it.each(["/admin/docs", "/admin/openapi.json"])(
    "protects %s through current active administrator identity",
    async (path) => {
      for (const [id, status] of [
        [null, 401],
        ["user", 403],
        ["inactive", 401],
        ["missing", 401],
        ["admin", 200],
      ] as const) {
        mocks.getSession.mockResolvedValue(id ? { user: { id } } : null);
        const response = await request(path);
        expect(response.status, `${path} identity=${id}`).toBe(status);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
      }
    },
  );

  it("audits every actual method/path against the generated administrator document", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin" } });
    const response = await request("/admin/openapi.json");
    expect(response.status).toBe(200);
    const spec: Document = await response.json();
    const report = assertOpenApiCoverage(apiApp, spec);
    expect(report.operations).toBeGreaterThan(50);
    expect(report.excluded["ALL /auth/*"]).toContain("deny-by-default");
    expect(spec.paths?.["/admin/users"]?.get).toBeDefined();
    expect(spec.paths?.["/locations"]?.post).toBeDefined();
  });

  it("does not let cached admin documents cross audience or authentication boundaries", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin" } });
    expect((await request("/admin/openapi.json")).status).toBe(200);
    mocks.getSession.mockResolvedValue(null);
    expect((await request("/admin/openapi.json")).status).toBe(401);
    const publicSpec: Document = await (await request("/openapi.json")).json();
    expect(publicSpec.paths?.["/admin/users"]).toBeUndefined();
    expect(publicSpec.paths?.["/locations"]?.post).toBeUndefined();
  });

  it("removes transitive admin-only components while preserving shared references", async () => {
    const app = createApiApp<{ Bindings: ApiBindings }>();
    const shared = z.object({ name: z.string() }).openapi("SharedDocumentRow");
    const privateDetail = z
      .object({ internalNote: z.string() })
      .openapi("AdminDocumentDetail");
    const privateSchema = z
      .object({ shared, detail: privateDetail })
      .openapi("AdminDocumentRow");
    app.openapi(
      createRoute({
        method: "get",
        path: "/public-example",
        operationId: "publicExample",
        "x-audience": "public",
        responses: { 200: jsonResponse(shared, "Public") },
      }),
      (c) => c.json({ name: "Example" }, 200),
    );
    app.openapi(
      createRoute({
        method: "get",
        path: "/admin-example",
        operationId: "adminExample",
        "x-audience": "admin",
        responses: { 200: jsonResponse(privateSchema, "Admin") },
      }),
      (c) =>
        c.json(
          {
            shared: { name: "Example" },
            detail: { internalNote: "Synthetic" },
          },
          200,
        ),
    );
    registerDocumentation(app);
    mocks.getSession.mockResolvedValue({ user: { id: "admin" } });
    const admin: Document = await (
      await app.request("/admin/openapi.json", {}, bindings())
    ).json();
    expect(admin.components?.schemas?.AdminDocumentDetail).toBeDefined();
    mocks.getSession.mockResolvedValue(null);
    const publicSpec: Document = await (
      await app.request("/openapi.json", {}, bindings())
    ).json();
    expect(publicSpec.components?.schemas?.AdminDocumentRow).toBeUndefined();
    expect(publicSpec.components?.schemas?.AdminDocumentDetail).toBeUndefined();
    expect(publicSpec.components?.schemas?.SharedDocumentRow).toBeDefined();
    assertOpenApiDocument(publicSpec);
    assertOpenApiDocument(admin);
  });
});

/** Static artifact checks complement HTTP behavior tests; no implementation snapshots. */
describe("OpenAPI coverage gate", () => {
  async function specimen(audience?: string, extra = false) {
    const app = new OpenAPIHono();
    app.use("*", async (_c, next) => next());
    if (extra) app.get("/forgotten", (c) => c.json({ success: true }));
    const route = createRoute({
      method: "get",
      path: "/known",
      operationId: "knownOperation",
      "x-audience": audience,
      responses: { 200: jsonResponse(z.object({ name: z.string() }), "Known") },
    });
    app.openapi(route, (c) => c.json({ name: "Example" }, 200));
    app.doc31("/openapi.json", {
      openapi: "3.1.0",
      info: { title: "Audit", version: "1" },
    });
    const spec: Document = await (await app.request("/openapi.json")).json();
    return { app, spec };
  }
  it("fails unknown endpoints without counting repeated middleware entries twice", async () => {
    const { app, spec } = await specimen("public");
    expect(assertOpenApiCoverage(app, spec).operations).toBe(1);
    const unclassified = await specimen("public", true);
    expect(() =>
      assertOpenApiCoverage(unclassified.app, unclassified.spec),
    ).toThrow("Undocumented registered route: GET /forgotten");
  });
  it.each([undefined, "invalid"])(
    "rejects unclassified audience %s",
    async (audience) => {
      const { spec } = await specimen(audience);
      expect(() => assertOpenApiDocument(spec)).toThrow(
        "Unclassified operation",
      );
    },
  );
  it("rejects references to unregistered cookie security schemes", async () => {
    const { spec } = await specimen("public");
    spec.paths!["/known"]!.get!.security = [{ missingCookieScheme: [] }];
    expect(() => assertOpenApiDocument(spec)).toThrow(
      "Missing security scheme: missingCookieScheme",
    );
  });
  it("rejects duplicate operation IDs and unresolved references in generated artifacts", async () => {
    const { spec } = await specimen("public");
    spec.paths!["/duplicate"] = structuredClone(spec.paths!["/known"]);
    expect(() => assertOpenApiDocument(spec)).toThrow("Duplicate operationId");
    delete spec.paths!["/duplicate"];
    spec.components = {
      schemas: { Broken: { $ref: "#/components/schemas/Missing" } },
    };
    expect(() => assertOpenApiDocument(spec)).toThrow(
      "Unresolved schema reference",
    );
  });
});
