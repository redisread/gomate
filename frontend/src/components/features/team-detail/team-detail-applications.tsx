import * as React from "react";
import { Loader2, UserCheck, Crown } from "lucide-react";
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

  const name = application.user.nickname || application.user.name || "用户";
  const timeAgo = application.createdAt ? formatRelativeTime(new Date(application.createdAt)) : "";

  return (
    <div className="p-3 bg-card rounded-xl hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2.5 mb-2">
        <a
          href={`/users/${application.user.id}`}
          className="flex items-center gap-2.5 flex-1 min-w-0 hover:text-amber-700 transition-colors"
        >
          <Avatar name={name} avatar={application.user.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            {timeAgo && <p className="text-xs text-muted-foreground/70">{timeAgo} 申请</p>}
          </div>
        </a>
      </div>
      {isTeamFull ? (
        <div className="text-center text-xs text-muted-foreground/70 bg-muted py-2 rounded-lg">
          名额已满
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {approving && <Loader2 className="w-3 h-3 animate-spin" />}
            {approving ? "处理中" : "批准"}
          </button>
          <button
            onClick={handleReject}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {rejecting && <Loader2 className="w-3 h-3 animate-spin" />}
            {rejecting ? "处理中" : "拒绝"}
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
  if (applications.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserCheck className="w-3.5 h-3.5" />
          <span className="font-medium">待审核申请</span>
        </div>
        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
          {applications.length} 人
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
