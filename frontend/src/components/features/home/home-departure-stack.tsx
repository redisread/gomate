import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { Avatar } from "@/components/ui/avatar";
import type { Team } from "@/lib/types";
import { formatTeamStart } from "@/lib/team-display";

const DECK_POSITIONS = [
  "z-30 translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100",
  "z-20 translate-x-5 translate-y-7 rotate-2 scale-[0.96] opacity-90 sm:translate-x-8",
  "z-10 -translate-x-4 translate-y-12 -rotate-2 scale-[0.92] opacity-70 sm:-translate-x-7",
] as const;

const SWIPE_THRESHOLD = 48;
const CLICK_CANCEL_THRESHOLD = 8;
const MAX_DRAG_DISTANCE = 144;

function RemainingSpots({ team }: { team: Team }) {
  const { t } = useI18n(["home", "common"]);
  const remaining = Math.max(0, team.maxParticipants - team.activeParticipantCount);

  return (
    <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-amber-900 dark:bg-amber-200 dark:text-amber-950">
      {remaining === 0
        ? t("home.departures.full")
        : t("home.departures.remaining", { count: remaining })}
    </span>
  );
}

interface DepartureCardProps {
  team: Team;
  index: number;
  deckPosition: number;
  isActive: boolean;
  isDragging: boolean;
  dragOffset: number;
}

function DepartureCard({
  team,
  index,
  deckPosition,
  isActive,
  isDragging,
  dragOffset,
}: DepartureCardProps) {
  const { t } = useI18n(["home"]);
  const coverImage = team.location?.coverImageUrl;
  const locationName = team.location?.name;
  const leaderName = team.leader?.nickname || team.leader?.name || t("common.unknown");
  const start = formatTeamStart(team);

  return (
    <div
      aria-hidden={!isActive}
      data-active={isActive}
      data-testid="guest-departure-card"
      className={`absolute inset-x-0 top-3 flex justify-center transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none ${DECK_POSITIONS[deckPosition]}`}
    >
      <div
        className={`w-[88%] max-w-[30rem] ${isDragging ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"}`}
        style={
          isActive
            ? ({
                transform: `translate3d(${dragOffset}px, 0, 0)`,
              } satisfies CSSProperties)
            : undefined
        }
      >
        <a
          href={`/teams/${team.id}`}
          tabIndex={isActive ? 0 : -1}
          className={`group relative block h-[22rem] overflow-hidden rounded-[2rem] bg-neutral-900 text-white shadow-warm-xl ring-1 ring-black/10 transition-[transform,box-shadow] duration-300 ease-out motion-reduce:transition-none sm:h-[24rem] lg:h-[27rem] ${isActive ? "pointer-events-auto active:scale-[0.98] lg:hover:-translate-y-1 lg:hover:shadow-2xl" : "pointer-events-none"}`}
        >
          {coverImage ? (
            <LocationCoverImage src={coverImage} alt="" priority={index === 0} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-neutral-900" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" aria-hidden="true" />

          <div className="absolute inset-0 flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-xs font-semibold text-white/90">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {start.date}{start.time ? ` · ${start.time}` : ""}
              </span>
              <RemainingSpots team={team} />
            </div>

            <div className="mt-auto">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{team.title}</h2>
              {locationName && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/75">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{locationName}</span>
                </p>
              )}
              <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar src={team.leader?.image} name={leaderName} size="sm" className="ring-white/80" />
                  <span className="truncate text-xs text-white/75">{t("home.departures.startedBy", { name: leaderName })}</span>
                </div>
                <span className="ml-3 shrink-0 font-mono text-xs font-semibold text-white/90">
                  {team.activeParticipantCount} / {team.maxParticipants}
                </span>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

export function HomeDepartureStack({ teams }: { teams: Team[] }) {
  const { t } = useI18n(["home", "common"]);
  const featuredTeams = teams.slice(0, 3);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const dragDistance = useRef(0);
  const suppressClick = useRef(false);
  const instructionsId = useId();

  if (featuredTeams.length === 0) {
    return (
      <div className="flex h-[25rem] items-center justify-center rounded-[2rem] bg-brand-muted px-8 text-center ring-1 ring-primary/15 lg:h-[32rem]" data-testid="guest-departure-stack-empty">
        <div className="max-w-xs">
          <Users className="mx-auto h-12 w-12 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-5 text-xl font-bold text-foreground">{t("home.departures.emptyTitle")}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("home.departures.emptyDescription")}</p>
          <a href="/teams" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform duration-150 active:scale-95">
            {t("home.departures.viewAll")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  const currentIndex = activeIndex % featuredTeams.length;

  const showPrevious = () => {
    setActiveIndex((current) =>
      (current - 1 + featuredTeams.length) % featuredTeams.length,
    );
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % featuredTeams.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (featuredTeams.length < 2) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(featuredTeams.length - 1);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      featuredTeams.length < 2 ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    pointerStartX.current = event.clientX;
    dragDistance.current = 0;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;

    const distance = event.clientX - pointerStartX.current;
    dragDistance.current = distance;
    setDragOffset(
      Math.max(-MAX_DRAG_DISTANCE, Math.min(MAX_DRAG_DISTANCE, distance)),
    );
  };

  const finishPointerGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;

    const distance = dragDistance.current;
    suppressClick.current = Math.abs(distance) > CLICK_CANCEL_THRESHOLD;

    if (distance <= -SWIPE_THRESHOLD) {
      showNext();
    } else if (distance >= SWIPE_THRESHOLD) {
      showPrevious();
    }

    pointerStartX.current = null;
    dragDistance.current = 0;
    setDragOffset(0);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("home.departures.carouselLabel")}
      aria-describedby={instructionsId}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative min-w-0 w-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      data-testid="guest-departure-stack"
    >
      <div
        className="relative h-[25rem] min-w-0 w-full touch-pan-y select-none sm:h-[27rem] lg:h-[31rem]"
        data-testid="guest-departure-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerGesture}
        onPointerCancel={(event) => {
          pointerStartX.current = null;
          dragDistance.current = 0;
          suppressClick.current = false;
          setDragOffset(0);
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
      >
        {featuredTeams.map((team, index) => {
          const deckPosition =
            (index - currentIndex + featuredTeams.length) % featuredTeams.length;
          const isActive = deckPosition === 0;

          return (
            <DepartureCard
              key={team.id}
              team={team}
              index={index}
              deckPosition={deckPosition}
              isActive={isActive}
              isDragging={isActive && pointerStartX.current !== null}
              dragOffset={dragOffset}
            />
          );
        })}
      </div>

      {featuredTeams.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={showPrevious}
            aria-label={t("home.departures.previous")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-[transform,border-color,color] duration-150 hover:border-primary/50 hover:text-primary active:scale-95 motion-reduce:transition-none"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2" aria-hidden="true">
            {featuredTeams.map((team, index) => (
              <span
                key={team.id}
                className={`h-2 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${index === currentIndex ? "w-6 bg-primary" : "w-2 bg-border"}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={showNext}
            aria-label={t("home.departures.next")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-[transform,border-color,color] duration-150 hover:border-primary/50 hover:text-primary active:scale-95 motion-reduce:transition-none"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <p id={instructionsId} className="mt-3 text-center text-xs text-muted-foreground">
        {t("home.departures.swipeHint")}
      </p>
      <p className="sr-only" aria-live="polite">
        {featuredTeams[currentIndex]?.title}
      </p>
    </div>
  );
}
