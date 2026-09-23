import assert from "node:assert/strict";
import test from "node:test";

import {
  auditAdminI18nSource,
  runAdminI18nAudit,
} from "./validate-admin-i18n.mjs";

const localeKeys = new Set([
  "admin.editLocation",
  "admin.management.save",
  "enums.locationStatus.draft",
]);

test("rejects hardcoded administrator page titles and visible copy", () => {
  const issues = auditAdminI18nSource({
    filePath: "src/pages/admin/example.astro",
    code: `
      <AdminLayout title="Edit location">
        <button aria-label="Save location">Save</button>
      </AdminLayout>
    `,
    localeKeys,
  });

  assert.deepEqual(
    new Set(issues.map((issue) => issue.rule)),
    new Set(["literal_admin_title", "hardcoded_ui_copy"]),
  );
});

test("rejects unknown static keys and retired administrator enum keys", () => {
  const issues = auditAdminI18nSource({
    filePath: "src/components/admin/example.tsx",
    code: `
      const one = t("admin.missingKey");
      const two = t("admin.seasons.spring");
      const three = t("admin.statusDraft");
    `,
    localeKeys,
  });

  assert.ok(issues.some((issue) => issue.rule === "unknown_translation_key"));
  assert.equal(
    issues.filter((issue) => issue.rule === "retired_admin_key").length,
    2,
  );
});

test("rejects raw role/status output and unsafe administrator error helpers", () => {
  const issues = auditAdminI18nSource({
    filePath: "src/components/admin/example.tsx",
    code: `
      <p>{user.status} · {user.role}</p>
      getApiErrorMessage(payload, fallback);
      apiPatch("/admin/users/1/role", { role: "admin" });
    `,
    localeKeys,
  });

  assert.ok(issues.some((issue) => issue.rule === "raw_admin_enum"));
  assert.equal(
    issues.filter((issue) => issue.rule === "unsafe_admin_error_helper").length,
    2,
  );
});

test("rejects using the raw Astro locale for administrator SSR data", () => {
  const issues = auditAdminI18nSource({
    filePath: "src/pages/admin/example.astro",
    code: `
      const locale = Astro.locals.locale;
      const data = await loadLocaleData(["admin"], locale, Astro.url.origin);
    `,
    localeKeys,
  });

  assert.ok(issues.some((issue) => issue.rule === "unresolved_admin_locale"));
});

test("rejects raw Astro locale aliases and direct loader arguments", () => {
  const issues = auditAdminI18nSource({
    filePath: "src/pages/admin/example.astro",
    code: `
      const rawLocale: string = Astro.locals.locale;
      const locale = rawLocale;
      const direct = await loadLocaleData(["admin"], Astro.locals.locale, origin);
    `,
    localeKeys,
  });

  assert.equal(
    issues.filter((issue) => issue.rule === "unresolved_admin_locale").length,
    2,
  );
});

test("accepts translated copy and technical placeholders", () => {
  const issues = auditAdminI18nSource({
    filePath: "src/components/admin/example.tsx",
    code: `
      <AdminLayout title={t("admin.editLocation")}>
        <button aria-label={t("admin.management.save")}>
          {t("admin.management.save")}
        </button>
        <input placeholder="https://" />
        <input placeholder="22.5619" />
        <span>{t(locationStatusKey("draft"))}</span>
      </AdminLayout>
    `,
    localeKeys,
  });

  assert.deepEqual(issues, []);
});

test("the current administrator source tree passes the focused audit", () => {
  assert.deepEqual(runAdminI18nAudit(process.cwd()), []);
});
