import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { I18nProvider } from "./context";
import { useI18n } from "../hooks/useI18n";

function Copy() {
  const { t, locale, loading } = useI18n(["common"]);
  return <p lang={locale} data-loading={loading}>{t("common.loading")}</p>;
}

it("renders request-owned translations without waiting for effects or leaking another locale", () => {
  const render = (locale: "en" | "zh-CN", label: string) => renderToString(
    <I18nProvider snapshot={{ locale, namespaces: { common: { loading: label } } }}><Copy /></I18nProvider>,
  );
  expect(render("en", "Loading")).toBe('<p lang="en" data-loading="false">Loading</p>');
  expect(render("zh-CN", "正在加载")).toBe('<p lang="zh-CN" data-loading="false">正在加载</p>');
  expect(render("en", "Loading")).toContain(">Loading</p>");
});
