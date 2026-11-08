import * as React from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/starwind-react/button";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchPublicAPI } from "@/lib/api";
import type { TeamResponse } from "@/contracts/team-api";
import type { SelfUserResponse } from "@/contracts/public-responses";
import {
  createPosterContent,
  type TeamPosterContent,
} from "./team-poster-content";

type PosterState =
  | { status: "loading" | "login" | "error" }
  | {
      status: "ready";
      url: string;
      content: TeamPosterContent;
      coverFallback: boolean;
    };

export function TeamSharePoster({ teamId }: { teamId: string }) {
  const { t, locale } = useI18n(["teams", "enums", "common"]);
  const [open, setOpen] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<PosterState>({ status: "loading" });
  const request = React.useRef<AbortController | null>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const closeButton = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    request.current = controller;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(20_000),
    ]);
    const onTimeout = () => {
      if (!controller.signal.aborted) setState({ status: "error" });
    };
    signal.addEventListener("abort", onTimeout, { once: true });
    let objectUrl: string | undefined;
    setState({ status: "loading" });
    void (async () => {
      try {
        // Bypass the page's identity memo so a revoked session cannot start generation.
        const session = await fetchAPI("/users/me", {
          signal,
          cache: "no-store",
        });
        if (session.status === 401) {
          signal.throwIfAborted();
          setState({ status: "login" });
          return;
        }
        if (!session.ok) throw new Error("poster_session_unavailable");
        const identity = await session.json<SelfUserResponse>();
        if (!identity.user?.id) {
          signal.throwIfAborted();
          setState({ status: "login" });
          return;
        }
        // Always request a fresh anonymous projection, even for leaders and members.
        const response = await fetchPublicAPI(
          `/teams/${encodeURIComponent(teamId)}`,
          { signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("poster_team_unavailable");
        const data = await response.json<TeamResponse>();
        if (!data.success || !data.team)
          throw new Error("poster_team_unavailable");
        const content = createPosterContent(
          data.team,
          locale,
          window.location.origin,
          t,
        );
        const { renderTeamPoster } = await import("./render-team-poster");
        signal.throwIfAborted();
        const result = await renderTeamPoster(content, signal);
        signal.throwIfAborted();
        objectUrl = URL.createObjectURL(result.blob);
        setState({
          status: "ready",
          url: objectUrl,
          content,
          coverFallback: result.coverFallback,
        });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      } finally {
        signal.removeEventListener("abort", onTimeout);
      }
    })();
    return () => {
      signal.removeEventListener("abort", onTimeout);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, attempt, teamId, locale, t]);

  const close = () => {
    request.current?.abort();
    setOpen(false);
  };

  return (
    <>
      <Button
        ref={trigger}
        variant="plain"
        size="inherit"
        type="button"
        onClick={() => {
          setState({ status: "loading" });
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold text-foreground shadow-card hover:bg-muted"
      >
        <Share2 aria-hidden="true" className="h-4 w-4" />
        {t("teams.poster.action")}
      </Button>
      <Modal
        open={open}
        onClose={close}
        labelledBy={titleId}
        describedBy={descriptionId}
        initialFocusRef={closeButton}
        returnFocusRef={trigger}
        overlayClassName="flex items-center justify-center p-4"
        panelClassName="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-background shadow-card-hover"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {t("teams.poster.action")}
          </h2>
          <Button
            ref={closeButton}
            variant="plain"
            size="inherit"
            type="button"
            onClick={close}
            aria-label={t("common.close")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-4">
          <p
            id={descriptionId}
            className="mb-4 text-sm leading-6 text-muted-foreground"
          >
            {t("teams.poster.description")}
          </p>
          {state.status === "loading" && (
            <p
              role="status"
              className="py-12 text-center text-muted-foreground"
            >
              {t("teams.poster.generating")}
            </p>
          )}
          {state.status === "login" && (
            <div className="space-y-4 py-6">
              <p role="status">{t("teams.poster.loginRequired")}</p>
              <Button
                as="a"
                variant="primary"
                href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
              >
                {t("teams.loginBtn")}
              </Button>
            </div>
          )}
          {state.status === "error" && (
            <div className="space-y-4 py-6">
              <p role="alert">{t("teams.poster.failed")}</p>
              <Button
                variant="primary"
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("common.retry")}
              </Button>
            </div>
          )}
          {state.status === "ready" && (
            <>
              <img
                src={state.url}
                width={1080}
                height={1440}
                alt={t("teams.poster.imageAlt", { title: state.content.title })}
                className="h-auto w-full rounded-xl"
              />
              <p className="sr-only">
                {[
                  state.content.title,
                  state.content.location,
                  state.content.activity,
                  state.content.status,
                  state.content.capacity,
                  state.content.date,
                  state.content.weekday,
                  state.content.startTime,
                  state.content.endLabel,
                  state.content.endTime,
                  state.content.timeZone,
                  state.content.note,
                ].join(" · ")}
              </p>
              {state.coverFallback && (
                <p role="status" className="mt-3 text-sm text-muted-foreground">
                  {t("teams.poster.coverFallback")}
                </p>
              )}
            </>
          )}
        </div>
        {state.status === "ready" && (
          <div className="shrink-0 space-y-2 bg-background px-4 pb-4 pt-3">
            <Button
              as="a"
              variant="primary"
              href={state.url}
              download={`gomate-team-${teamId}.png`}
              className="flex min-h-11 w-full items-center justify-center gap-2"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("teams.poster.save")}
            </Button>
            <p className="text-sm leading-5 text-muted-foreground">
              {t("teams.poster.saveHint")}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
