import * as React from "react";
import { animate } from "motion/mini";
import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import { useI18n } from "@/hooks/useI18n";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { buildLocalePath } from "./locale-toggle";

const routes = ["/", "/locations", "/teams"] as const;
const labels = ["nav.home", "nav.locations", "nav.teams"] as const;

export function activeNavRoute(path: string) {
  const clean = path.replace(/^\/(?:en|zh-CN)(?=\/|$)/, "") || "/";
  return routes.find((route) =>
    route === "/"
      ? clean === "/"
      : clean === route || clean.startsWith(`${route}/`),
  );
}

function NavIndicator({
  x,
  width,
  reduced,
}: {
  x: number;
  width: number;
  reduced: boolean;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const initial = React.useRef({ x, width });
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const animation = animate(
      element,
      { transform: `translateX(${x}px)`, width: `${width}px` },
      { duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] },
    );
    // Commit the current position before retargeting, including a live reduced-motion change.
    return () => animation.stop();
  }, [x, width, reduced]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-testid="nav-slider"
      style={{
        width: initial.current.width,
        transform: `translateX(${initial.current.x}px)`,
      }}
      className="pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-lg bg-accent"
    >
      <span className="absolute bottom-0.5 left-3.5 right-3.5 h-0.5 rounded-full bg-primary" />
    </span>
  );
}

/** One live indicator; the links and their text never scale with it. */
export function MainNav({ currentPath }: { currentPath: string }) {
  const { t, locale } = useI18n(["nav", "common"]);
  const reduced = useReducedMotion();
  const container = React.useRef<HTMLElement>(null);
  const request = React.useRef(0);
  const [pending, setPending] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [bounds, setBounds] = React.useState<{
    x: number;
    width: number;
  } | null>(null);
  const selected = activeNavRoute(pending ?? currentPath);

  React.useEffect(() => {
    const nav = container.current;
    if (!nav) return;
    const measure = () => {
      const link = nav.querySelector<HTMLElement>(`[data-route="${selected}"]`);
      setBounds(
        link && nav.getBoundingClientRect().width > 0
          ? { x: link.offsetLeft, width: link.offsetWidth }
          : null,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    nav.querySelectorAll("a").forEach((link) => observer.observe(link));
    return () => observer.disconnect();
  }, [selected, locale]);

  React.useEffect(() => {
    // Only our awaited clicks replace Astro's hard-reload error fallback.
    // Other links and history navigation keep the router's normal behavior.
    const prepare = (event: TransitionBeforePreparationEvent) => {
      if (!event.info?.mainNav) {
        request.current++;
        setPending(null);
        setFailed(false);
        return;
      }
      const loader = event.loader;
      event.loader = async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            loader(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error("navigation_timeout")),
                15_000,
              );
            }),
          ]);
          if (
            !event.signal.aborted &&
            (event.defaultPrevented ||
              !event.newDocument.querySelector("[data-tab-router]"))
          ) {
            throw new Error("navigation_failed");
          }
        } finally {
          clearTimeout(timer);
        }
      };
    };
    const invalidate = () => {
      request.current++;
    };
    const clearError = () => setFailed(false);
    document.addEventListener("astro:after-swap", clearError);
    document.addEventListener("astro:before-preparation", prepare);
    return () => {
      invalidate();
      document.removeEventListener("astro:before-preparation", prepare);
      document.removeEventListener("astro:after-swap", clearError);
    };
  }, []);

  const navigate = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    route: string,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !document.documentElement.hasAttribute("data-tab-router")
    )
      return;
    event.preventDefault();
    const link = event.currentTarget;
    const attempt = ++request.current;
    setPending(route);
    setFailed(false);
    try {
      const { navigate: go } = await import("astro:transitions/client");
      if (attempt !== request.current) return;
      await go(link.href, { sourceElement: link, info: { mainNav: true } });
    } catch {
      if (attempt === request.current) setFailed(true);
    } finally {
      if (attempt === request.current) setPending(null);
    }
  };

  return (
    <div className="relative hidden md:block">
      <nav
        data-main-navigation
        ref={container}
        aria-label={t("common.mainNav")}
        aria-busy={pending !== null}
        className="relative isolate flex items-center gap-1"
      >
        {bounds && (
          <NavIndicator x={bounds.x} width={bounds.width} reduced={reduced} />
        )}
        {routes.map((route, index) => (
          <a
            key={route}
            href={buildLocalePath(route, locale)}
            data-route={route}
            data-testid={`nav-link-${route.replace(/\//g, "-") || "home"}`}
            aria-current={
              activeNavRoute(currentPath) === route ? "page" : undefined
            }
            onClick={(event) => {
              void navigate(event, route);
            }}
            className={cn(
              "flex min-h-11 items-center rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
              selected === route
                ? "text-amber-800 dark:text-amber-300"
                : "text-stone-700 dark:text-stone-300 hover:text-foreground hover:bg-accent",
            )}
          >
            {t(labels[index])}
          </a>
        ))}
      </nav>
      {failed && (
        <p
          role="alert"
          className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-card p-3 text-sm text-foreground shadow-card"
        >
          {t("nav.navigationFailed")}
        </p>
      )}
    </div>
  );
}
