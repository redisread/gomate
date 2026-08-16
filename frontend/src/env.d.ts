import "../.astro/types.d.ts";

import type { Locale } from "./i18n";

declare global {
  interface Body {
    // Cloudflare's generated runtime declarations expose json<T>() without a
    // default, which otherwise makes unannotated browser fetches `unknown`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json(): Promise<any>;
  }
}

declare module "astro" {
  interface Locals {
    locale?: Locale;
    __i18n_namespaces?: string[];
  }
}
