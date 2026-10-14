import * as React from "react";
import { X } from "lucide-react";
import type { AdminTeamResponse, Team } from "@/contracts";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import { adminCatchMessage, adminJsonOrThrow } from "@/lib/admin-i18n";
import { AdminTeamDetailContent } from "./admin-team-detail-content";

interface Props {
  teamId: string | null;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}

export function AdminTeamDetail({ teamId, onClose, returnFocusRef }: Props) {
  const { t, locale } = useI18n(["admin", "enums"]);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [error, setError] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  React.useEffect(() => {
    setTeam(null);
    setError("");
    if (!teamId) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetchAPI(
          `/admin/teams/${encodeURIComponent(teamId)}`,
          { signal: controller.signal },
        );
        const body = await adminJsonOrThrow<AdminTeamResponse>(
          response,
          t,
          "admin.management.loadFailed",
        );
        if (active) setTeam(body.team);
      } catch (cause) {
        if (active)
          setError(adminCatchMessage(cause, t, "admin.management.loadFailed"));
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [teamId, t, attempt]);

  return (
    <Modal
      open={Boolean(teamId)}
      onClose={onClose}
      labelledBy={titleId}
      initialFocusRef={closeRef}
      returnFocusRef={returnFocusRef}
      lockBodyScroll
      overlayClassName="flex items-end justify-center sm:items-center sm:p-4"
      backdropClassName="bg-foreground/30"
      panelClassName="flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full min-w-0 flex-col overflow-hidden rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] text-foreground shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:rounded-2xl sm:pb-0"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {t("admin.teamsManagement.detailTitle")}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("admin.teamsManagement.closeDetail")}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain break-words px-4 py-5 text-sm sm:px-6">
        {!team && !error && (
          <p role="status">{t("admin.management.loading")}</p>
        )}
        {error && (
          <div role="alert" className="space-y-3">
            <p className="text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="min-h-11 rounded-lg border border-border px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("admin.teamsManagement.retry")}
            </button>
          </div>
        )}
        {team && <AdminTeamDetailContent team={team} t={t} locale={locale} />}
      </div>
    </Modal>
  );
}
