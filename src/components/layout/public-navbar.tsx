import * as React from "react";

import { AdminQuickAction } from "@/components/admin/admin-quick-action";
import { AdminQuickLocationForm } from "@/components/admin/admin-quick-location-form";
import { useI18n } from "@/hooks/useI18n";

import { Navbar } from "./navbar";

const ADMIN_NAMESPACES = ["admin"];

export function PublicNavbar() {
  const { t } = useI18n(ADMIN_NAMESPACES);
  const actionRef = React.useRef<HTMLInputElement>(null);

  return (
    <Navbar
      renderAdminQuickAction={() => (
        <AdminQuickAction
          label={t("admin.platform.quickActionLabel")}
          title={t("admin.platform.quickActionTitle")}
          closeLabel={t("admin.platform.closeQuickAction")}
          initialFocusRef={actionRef}
        >
          <AdminQuickLocationForm initialFocusRef={actionRef} />
        </AdminQuickAction>
      )}
    />
  );
}
