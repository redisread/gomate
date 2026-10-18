import * as React from "react";

import { AdminQuickActionDialog } from "@/components/admin/admin-quick-action";
import { AdminQuickLocationForm } from "@/components/admin/admin-quick-location-form";
import { useI18n } from "@/hooks/useI18n";

import { Navbar } from "./navbar";

const ADMIN_NAMESPACES = ["admin"];

export function PublicNavbar() {
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
          <AdminQuickLocationForm initialFocusRef={actionRef} />
        </AdminQuickActionDialog>
      )}
    />
  );
}
