/** Keep both email and OAuth returns on a navigable page of this origin. */
export function resolveLoginReturnPath(
  value: string | null | undefined,
): string {
  if (
    !value ||
    value.length > 2_048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127,
    )
  )
    return "/";
  const pathname = value.split(/[?#]/u, 1)[0];
  if (/%(?:2e|2f|5c|25)/iu.test(pathname)) return "/";
  const url = new URL(value, "https://gomate.invalid");
  const pagePath = url.pathname.replace(/^\/(?:en|zh-CN)(?=\/|$)/u, "");
  if (
    url.origin !== "https://gomate.invalid" ||
    /^\/(?:api|login|register|verify-email|reset-password)(?:\/|$)/u.test(pagePath)
  )
    return "/";
  return `${url.pathname}${url.search}`;
}


/** Keep authentication links and their destination in the same language. */
export function authPageHref(page: "login" | "register", returnTo: string): string {
  const target = resolveLoginReturnPath(returnTo);
  const prefix = target.match(/^\/(en|zh-CN)(?=\/|$)/u)?.[0] ?? "";
  const pathname = `${prefix}/${page}`;
  return target === "/" ? pathname : `${pathname}?${new URLSearchParams({ returnTo: target })}`;
}
