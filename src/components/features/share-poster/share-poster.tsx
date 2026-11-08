import * as React from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/starwind-react/button";
import { Modal } from "@/components/ui/modal";
import { fetchAPI } from "@/lib/api";
import type { SelfUserResponse } from "@/contracts/public-responses";

export interface PosterPreview {
  blob: Blob;
  title: string;
  accessibleText: string;
  coverFallback: boolean;
}

type PosterState =
  | { status: "loading" | "login" | "error" }
  | {
      status: "ready";
      url: string;
      title: string;
      accessibleText: string;
      coverFallback: boolean;
    };

export function SharePoster({
  generate,
  filename,
  namespace,
  t,
}: {
  generate: (signal: AbortSignal) => Promise<PosterPreview>;
  filename: string;
  namespace: "teams" | "locationDetail";
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
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
        const result = await generate(signal);
        signal.throwIfAborted();
        objectUrl = URL.createObjectURL(result.blob);
        setState({
          status: "ready",
          url: objectUrl,
          title: result.title,
          accessibleText: result.accessibleText,
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
  }, [open, attempt, generate]);

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
        {t(`${namespace}.poster.action`)}
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
            {t(`${namespace}.poster.action`)}
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
            {t(`${namespace}.poster.description`)}
          </p>
          {state.status === "loading" && (
            <p
              role="status"
              className="py-12 text-center text-muted-foreground"
            >
              {t(`${namespace}.poster.generating`)}
            </p>
          )}
          {state.status === "login" && (
            <div className="space-y-4 py-6">
              <p role="status">{t(`${namespace}.poster.loginRequired`)}</p>
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
              <p role="alert">{t(`${namespace}.poster.failed`)}</p>
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
                alt={t(`${namespace}.poster.imageAlt`, { title: state.title })}
                className="h-auto w-full rounded-xl"
              />
              <p className="sr-only">{state.accessibleText}</p>
              {state.coverFallback && (
                <p role="status" className="mt-3 text-sm text-muted-foreground">
                  {t(`${namespace}.poster.coverFallback`)}
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
              download={filename}
              className="flex min-h-11 w-full items-center justify-center gap-2"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t(`${namespace}.poster.save`)}
            </Button>
            <p className="text-sm leading-5 text-muted-foreground">
              {t(`${namespace}.poster.saveHint`)}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
