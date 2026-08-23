const ADMIN_ROOT = "/admin";
const ENCODED_PATH_BYPASS = /%(?:2e|2f|5c|25)/iu;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;

export function resolveAdminReturnPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER.test(value)
  ) {
    return "/";
  }

  const withoutFragment = value.split("#", 1)[0] ?? "";
  const rawPathname = withoutFragment.split("?", 1)[0] ?? "";
  if (ENCODED_PATH_BYPASS.test(rawPathname)) return "/";

  try {
    const parsed = new URL(withoutFragment, "https://gomate.invalid");
    if (
      parsed.origin !== "https://gomate.invalid" ||
      (parsed.pathname !== ADMIN_ROOT &&
        !parsed.pathname.startsWith(`${ADMIN_ROOT}/`))
    ) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}
