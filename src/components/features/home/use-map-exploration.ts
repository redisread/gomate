import * as React from "react";
import {
  getMapSelectionUrl,
  parseMapSelection,
  isMapProvince,
  type MapSelection,
} from "@/lib/china-map";
import type { MapPoint } from "./use-map-data";

const EMPTY: MapSelection = { province: null, locationId: null };

export function useMapExploration(points: MapPoint[], ready: boolean) {
  const [selection, setSelection] = React.useState<MapSelection>(EMPTY);
  const [animate, setAnimate] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState(false);
  const restoredScroll = React.useRef(false);

  const writeSelection = React.useCallback(
    (next: MapSelection, mode: "push" | "replace") => {
      window.history[`${mode}State`](
        window.history.state,
        "",
        getMapSelectionUrl(window.location.href, next),
      );
      setSelection(next);
    },
    [],
  );

  React.useEffect(() => {
    setSelection(parseMapSelection(window.location.search));
    const restore = () => {
      setSelection(parseMapSelection(window.location.search));
      setUnavailable(false);
      setAnimate(true);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  React.useEffect(() => {
    if (!ready || !selection.locationId) return;
    const point = points.find((point) => point.id === selection.locationId);
    if (!point) {
      setUnavailable(true);
      writeSelection({ ...selection, locationId: null }, "replace");
    } else if (
      point.provinceName &&
      isMapProvince(point.provinceName) &&
      selection.province !== point.provinceName
    ) {
      writeSelection({ ...selection, province: point.provinceName }, "replace");
    }
  }, [points, ready, selection, writeSelection]);

  React.useEffect(() => {
    if (!ready || restoredScroll.current) return;
    const saved = window.history.state?.gomateMapReturn;
    if (
      !saved ||
      saved.url !== `${window.location.pathname}${window.location.search}` ||
      !Number.isFinite(saved.y)
    )
      return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: saved.y, behavior: "instant" });
      restoredScroll.current = true;
      const state = { ...window.history.state };
      delete state.gomateMapReturn;
      window.history.replaceState(state, "");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready, selection]);

  const choose = (next: MapSelection) => {
    setAnimate(true);
    setUnavailable(false);
    const entering = !selection.province && Boolean(next.province);
    writeSelection(next, entering ? "push" : "replace");
  };

  return {
    selection,
    animate,
    unavailable,
    focusProvince: (province: string) => {
      if (province !== selection.province && isMapProvince(province))
        choose({ province, locationId: null });
    },
    selectPoint: (point: MapPoint) =>
      choose({
        province:
          point.provinceName && isMapProvince(point.provinceName)
            ? point.provinceName
            : selection.province,
        locationId: point.id,
      }),
    leaveProvince: () => choose(EMPTY),
    saveReturnPosition: () => {
      window.history.replaceState(
        {
          ...window.history.state,
          gomateMapReturn: {
            url: `${window.location.pathname}${window.location.search}`,
            y: window.scrollY,
          },
        },
        "",
      );
    },
  };
}
