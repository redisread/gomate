/// <reference types="astro/client" />
import "../.astro/types.d.ts";

import type { Locale } from "./i18n";
import type { AdminIdentity } from "./server/lib/admin-access";

declare global {
  namespace App {
    interface Locals {
      locale?: Locale;
      __i18n_namespaces?: string[];
      admin?: AdminIdentity;
    }
  }
}
