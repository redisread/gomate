/// <reference path="../.astro/types.d.ts" />

import type { Locale } from "./i18n";

declare module "astro" {
  interface Locals {
    locale?: Locale;
    __i18n_namespaces?: string[];
  }
}
