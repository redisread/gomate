import * as React from "react";
import type { MapSelection } from "@/lib/china-map";

export function useMapReturn(ready: boolean, selection: MapSelection) {
  const restored = React.useRef(false);
  React.useEffect(() => {
    if (!ready || restored.current) return;
    const saved = window.history.state?.gomateMapReturn;
    if (
      !saved ||
      saved.url !== `${window.location.pathname}${window.location.search}` ||
      !Number.isFinite(saved.y)
    )
      return;
    const root = document.documentElement;
    const previousAnchor = root.style.overflowAnchor;
    const previousRestoration = window.history.scrollRestoration;
    root.style.overflowAnchor = "none";
    window.history.scrollRestoration = "manual";
    let active = true;
    let frame = 0;
    const restore = () => {
      if (!active) return;
      const map = document.getElementById("map");
      const top =
        map && Number.isFinite(saved.mapTop)
          ? map.getBoundingClientRect().top + window.scrollY - saved.mapTop
          : saved.y;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      restored.current = true;
      const state = { ...window.history.state };
      delete state.gomateMapReturn;
      window.history.replaceState(state, "");
    };
    const schedule = () => {
      if (!active) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(restore);
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    observer?.observe(document.body);
    // Other islands (including the mobile footer) may hydrate after the map.
    // Hold the map's viewport position through those changes, until the user takes control.
    const release = () => {
      if (!active) return;
      active = false;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      root.style.overflowAnchor = previousAnchor;
      window.history.scrollRestoration = previousRestoration;
      for (const event of ["pointerdown", "touchstart", "wheel", "keydown"])
        window.removeEventListener(event, release, true);
      window.removeEventListener("resize", schedule);
    };
    for (const event of ["pointerdown", "touchstart", "wheel", "keydown"])
      window.addEventListener(event, release, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return release;
  }, [ready, selection]);

  return () => {
    const map = document.getElementById("map");
    window.history.replaceState(
      {
        ...window.history.state,
        gomateMapReturn: {
          url: `${window.location.pathname}${window.location.search}`,
          y: window.scrollY,
          mapTop: map?.getBoundingClientRect().top,
        },
      },
      "",
    );
  };
}
