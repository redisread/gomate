import { Button as SwButton } from "@/components/starwind-react/button";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Modal } from "@/components/ui/modal";
export function LeaveConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n(["teams", "common"]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      role="alertdialog"
      labelledBy="leave-confirm-title"
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="bg-popover rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]"
    >
      <h3
        id="leave-confirm-title"
        className="text-lg font-bold text-foreground mb-2"
      >
        {t("teams.leaveTeamConfirm")}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {t("teams.leaveTeamWarning")}
      </p>
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onConfirm}
        className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors mb-2"
      >
        {t("teams.leaveTeam")}
      </SwButton>
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onCancel}
        className="w-full py-3 rounded-2xl text-muted-foreground text-sm font-medium hover:bg-accent transition-colors"
      >
        {t("common.cancel")}
      </SwButton>
    </Modal>
  );
}

/* ── Form Team Confirm ── */

export function FormTeamConfirmDialog({
  open,
  isFull,
  isLoading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  isFull: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n(["teams", "common"]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      role="alertdialog"
      labelledBy="form-team-confirm-title"
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="bg-popover rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]"
    >
      <h3
        id="form-team-confirm-title"
        className="text-lg font-bold text-foreground mb-2"
      >
        {isFull
          ? t("teams.formTeamConfirm")
          : t("teams.formTeamUnderfilledConfirm")}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {t("teams.formTeamWarning")}
      </p>
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onConfirm}
        disabled={isLoading}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-sm font-semibold transition-colors mb-2 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("teams.confirmFormTeam")}
      </SwButton>
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="w-full py-3 rounded-2xl text-muted-foreground text-sm font-medium hover:bg-accent transition-colors"
      >
        {t("common.cancel")}
      </SwButton>
    </Modal>
  );
}
