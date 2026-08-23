import * as React from "react";

import { AdminQuickAction } from "@/components/admin/admin-quick-action";
import { useI18n } from "@/hooks/useI18n";

import { Navbar } from "./navbar";

const ADMIN_NAMESPACES = ["admin"];

export function PublicNavbar() {
  const { t } = useI18n(ADMIN_NAMESPACES);
  const actionRef = React.useRef<HTMLAnchorElement>(null);

  return (
    <Navbar
      renderAdminQuickAction={() => (
        <AdminQuickAction
          label={t("admin.platform.quickActionLabel")}
          title={t("admin.platform.quickActionTitle")}
          closeLabel={t("admin.platform.closeQuickAction")}
          initialFocusRef={actionRef}
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {t("admin.platform.newLocationDescription")}
            </p>
            <a
              ref={actionRef}
              href="/admin/locations/new?source=quick-action"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition-[background-color,scale] duration-100 hover:bg-primary/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {t("admin.platform.newLocationAction")}
            </a>
          </div>
        </AdminQuickAction>
      )}
    />
  );
}
