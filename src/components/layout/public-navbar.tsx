import { withI18n } from "@/i18n/context";
import * as React from "react";

import { AdminQuickActionDialog } from "@/components/admin/admin-quick-action";
const AdminQuickLocationForm = React.lazy(() => import("@/components/admin/admin-quick-location-form").then((module) => ({ default: module.AdminQuickLocationForm })));
import { useI18n } from "@/hooks/useI18n";

import { Navbar } from "./navbar";

const ADMIN_NAMESPACES = ["admin"];

function PublicNavbarContent() {
  const { t } = useI18n(ADMIN_NAMESPACES);
  const actionRef = React.useRef<HTMLInputElement>(null);

  return (
    <Navbar
      adminQuickActionLabel={t("admin.platform.quickActionLabel")}
      renderAdminQuickAction={(dialogProps) => (
        <AdminQuickActionDialog
          {...dialogProps}
          title={t("admin.platform.quickActionTitle")}
          closeLabel={t("admin.platform.closeQuickAction")}
          initialFocusRef={actionRef}
        >
          <React.Suspense fallback={<p role="status">{t("common.loading")}</p>}>
            <AdminQuickLocationForm initialFocusRef={actionRef} />
          </React.Suspense>
        </AdminQuickActionDialog>
      )}
    />
  );
}

export const PublicNavbar = withI18n(PublicNavbarContent);
