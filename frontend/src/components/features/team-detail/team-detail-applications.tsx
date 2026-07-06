import * as React from "react";
import { Loader2, UserCheck } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { formatRelativeTime } from "./team-detail-utils";
import { Avatar } from "./team-detail-ui";
import type { Application } from "@/lib/types";

function ApplicationCard({
  application,
  onApprove,
  onReject,
  isTeamFull,
}: {
  application: Application;
  onApprove: () => void;
  onReject: () => void;
  isTeamFull: boolean;
}) {
  const { t } = useI18n(["teams", "common"]);
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);

  const handleApprove = async () => {
    setApproving(true);
    await onApprove();
    setApproving(false);
  };

  const handleReject = async () => {
    setRejecting(true);
    await onReject();
    setRejecting(false);
  };

  const name = application.user.nickname || application.user.name || t("common.unknown");
  const timeAgo = application.createdAt ? formatRelativeTime(new Date(application.createdAt)) : "";

  return (
    <div
      data-testid="team-application-card"
      data-user-id={application.userId}
      className="p-3 bg-card rounded-xl hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <a
          href={`/users/${application.user.id}`}
          className="flex items-center gap-2.5 flex-1 min-w-0 hover:text-amber-700 transition-colors"
        >
          <Avatar name={name} avatar={application.user.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            {timeAgo && <p className="text-xs text-muted-foreground/70">{timeAgo} {t("teams.appliedLabel")}</p>}
          </div>
        </a>
      </div>
      {isTeamFull ? (
        <div className="text-center text-xs text-muted-foreground/70 bg-muted py-2 rounded-lg">
          {t('teams.teamFullAlert')}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            data-testid="team-application-approve"
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {approving && <Loader2 className="w-3 h-3 animate-spin" />}
            {approving ? t('teams.processing') : t('teams.approveBtn')}
          </button>
          <button
            data-testid="team-application-reject"
            onClick={handleReject}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {rejecting && <Loader2 className="w-3 h-3 animate-spin" />}
            {rejecting ? t('teams.processing') : t('teams.rejectBtn')}
          </button>
        </div>
      )}
    </div>
  );
}

export function TeamApplicationsSection({
  applications,
  onApprove,
  onReject,
  isFull,
}: {
  applications: Application[];
  onApprove: (uid: string) => void;
  onReject: (uid: string) => void;
  isFull: boolean;
}) {
  const { t } = useI18n(["teams"]);
  if (applications.length === 0) return null;

  return (
    <div data-testid="team-applications-section" className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserCheck className="w-3.5 h-3.5" />
          <span className="font-medium">{t('teams.pendingApplications')}</span>
        </div>
        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
          {t('teams.peopleCount').replace('{count}', String(applications.length))}
        </span>
      </div>
      <div className="space-y-2">
        {applications.map((app) => (
          <ApplicationCard
            key={app.id}
            application={app}
            onApprove={() => onApprove(app.userId)}
            onReject={() => onReject(app.userId)}
            isTeamFull={isFull}
          />
        ))}
      </div>
    </div>
  );
}
