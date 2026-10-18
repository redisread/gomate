import { Card as SwCard } from "@/components/starwind-react/card";
import { Button as SwButton } from "@/components/starwind-react/button";
import { Loader2, XCircle, CheckCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
export function CancelTeamModal({
  teamId,
  isCancelling,
  onConfirm,
  onCancel,
}: {
  teamId: string | null;
  isCancelling: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n(["myTeams", "teams", "common"]);
  if (!teamId) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <SwCard className="block gap-0 py-0 ring-0 bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {t("teams.cancelTeam")}
          </h3>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-500 leading-relaxed mb-5">
          {t("teams.cancelTeamConfirm")}
        </p>
        <div className="flex gap-2">
          <SwButton variant="plain" size="inherit" type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-500 text-sm font-medium hover:bg-stone-50 dark:bg-stone-900 transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </SwButton>
          <SwButton variant="plain" size="inherit" type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("teams.cancelTeam")}
          </SwButton>
        </div>
      </SwCard>
    </div>
  );
}

export function FormTeamModal({
  teamId,
  isFull,
  isForming,
  onConfirm,
  onCancel,
}: {
  teamId: string | null;
  isFull: boolean;
  isForming: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n(["myTeams", "teams", "common"]);
  if (!teamId) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <SwCard className="block gap-0 py-0 ring-0 bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {isFull
              ? t("teams.formTeamConfirm")
              : t("teams.formTeamUnderfilledConfirm")}
          </h3>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-500 leading-relaxed mb-5">
          {t("teams.formTeamWarning")}
        </p>
        <div className="flex gap-2">
          <SwButton variant="plain" size="inherit" type="button"
            onClick={onCancel}
            disabled={isForming}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-500 text-sm font-medium hover:bg-stone-50 dark:bg-stone-900 transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </SwButton>
          <SwButton variant="plain" size="inherit" type="button"
            onClick={onConfirm}
            disabled={isForming}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isForming && <Loader2 className="h-4 w-4 animate-spin" />}
            {isFull ? t("teams.formTeam") : t("teams.formTeamUnderfilled")}
          </SwButton>
        </div>
      </SwCard>
    </div>
  );
}
