import { MapPin, ArrowRight, AlertCircle, Clock, TrendingUp, Mountain } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useTeamDetail } from "./use-team-detail";
import { getStatusInfo } from "./team-detail-utils";
import { MemberAvatarGrid } from "./team-detail-members";
import { TeamActivityPosts } from "@/components/features/activity-posts";

export function TeamMainContent({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { team, location, allMembers, canJoin, isFull, isLeader, isMember, isPending, userId } = ctx;
  const { t } = useI18n(["enums", "teams"]);

  if (!team) return null;

  const statusInfo = getStatusInfo(team.status, t);

  return (
    <div className="space-y-6">
      {location && <LocationCover location={location} statusInfo={statusInfo} />}
      <RequirementsList requirements={team.requirements} />
      {allMembers.length > 0 && (
        <div className="bg-muted rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">{t('teams.guestList')}</h3>
            <span className="text-sm text-muted-foreground bg-white px-3 py-1 rounded-full">
              {allMembers.length} {t('teams.goingCount')}
            </span>
          </div>
          <MemberAvatarGrid
            members={allMembers}
            leaderId={team.leader?.id}
            teamId={team.id}
            canMessageMembers={isLeader}
          />
        </div>
      )}
      <JoinSection ctx={ctx} team={team} canJoin={canJoin} isFull={isFull} isLeader={isLeader} isMember={isMember} isPending={isPending} userId={userId} />
      {team.status === "completed" && (
        <TeamActivityPosts teamId={team.id} teamStatus={team.status} isMember={isMember} />
      )}
    </div>
  );
}

function LocationCover({ location, statusInfo }: { location: any; statusInfo: { label: string }; }) {
  const { t } = useI18n(["teams"]);
  return (
    <a href={`/locations/${location.id}`} className="group block">
      <div className="relative h-[300px] lg:h-[400px] rounded-2xl overflow-hidden bg-secondary hover:shadow-xl hover:shadow-amber-100/30 transition-all duration-300">
        {location.coverImage ? (
          <img
            src={location.coverImage}
            alt={location.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Mountain className="h-16 w-16 text-amber-400/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/90 text-white backdrop-blur-sm shadow-lg">
            {statusInfo.label}
          </span>
        </div>
        {location.cityName && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
              <MapPin className="w-3.5 h-3.5" />
              {location.cityName}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>{t('teams.activityLocation')}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{location.name}</h2>
          <LocationRouteInfo location={location} />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-sm border border-amber-400/30 text-amber-200 hover:text-white text-sm font-medium transition-all duration-150">
            <span>{t('teams.viewLocationDetail')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </div>
    </a>
  );
}

function LocationRouteInfo({ location }: { location: any; }) {
  const route = location.routes?.[0];
  if (!route) return null;
  return (
    <div className="flex items-center gap-4 text-white/70 text-sm mb-3">
      {route.duration && (
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {route.duration}
        </span>
      )}
      {route.distance && (
        <span className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {route.distance}
        </span>
      )}
    </div>
  );
}

function RequirementsList({ requirements }: { requirements: any; }) {
  const { t } = useI18n(["teams"]);
  if (!Array.isArray(requirements) || requirements.length === 0) return null;
  return (
    <div className="bg-muted rounded-2xl p-6 space-y-4">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        {t('teams.requirementsTitle')}
      </h3>
      <ul className="space-y-3">
        {requirements.map((req: string, i: number) => (
          <li key={i} className="flex items-start gap-3 text-base text-muted-foreground">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-medium flex items-center justify-center mt-0.5 flex-shrink-0">
              {i + 1}
            </span>
            {req}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JoinSection({ ctx, team, canJoin, isFull, isLeader, isMember, isPending, userId }: {
  ctx: ReturnType<typeof useTeamDetail>; team: any;
  canJoin: boolean; isFull: boolean; isLeader: boolean; isMember: boolean; isPending: boolean; userId: string | null;
}) {
  const { t } = useI18n(["teams"]);
  if (canJoin) {
    return (
      <button
        data-testid="team-join-button"
        onClick={() => ctx.setShowJoinModal(true)}
        className="w-full py-4 bg-amber-600 text-white text-lg font-medium rounded-xl hover:bg-amber-700 transition-colors"
      >
        {t('teams.joinTeam')}
      </button>
    );
  }

  if (!userId && !isLeader && !isMember && !isPending) {
    return (
      <div className="bg-muted rounded-2xl p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t('teams.loginToJoinTeam')}</p>
        <a href={`/login?redirect=/teams/${team.id}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors">
          {t('teams.loginBtn')}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  if (!canJoin && !isLeader && !isMember && !isPending && team.status === "recruiting" && isFull) {
    return (
      <div className="bg-muted rounded-2xl p-6 text-center">
        <p className="text-base text-muted-foreground/70">{t('teams.teamFullCannotJoin')}</p>
      </div>
    );
  }

  if (!canJoin && !isLeader && !isMember && !isPending && team.status !== "recruiting") {
    return (
      <div className="bg-muted rounded-2xl p-6 text-center">
        <p className="text-base text-muted-foreground/70">
          {team.status === "completed" ? t('teams.statusEnded') : t('teams.statusCancelled')}
        </p>
      </div>
    );
  }

  return null;
}
