import { useEffect, useRef, useState } from "react";
import { fetchPublicAPI } from "@/lib/api";
import {
  RandomLocationResponseSchema,
  type RandomLocationResponse,
} from "@/contracts/random-location";

const HISTORY_KEY = "gomate.random-locations.v1";
function readHistory(): string[] {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(HISTORY_KEY) ?? "[]",
    );
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === "string" && id.length > 0 && id.length <= 128,
            ),
          ),
        ].slice(-10)
      : [];
  } catch {
    return [];
  }
}

export function useRandomLocation() {
  const [result, setResult] = useState<RandomLocationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useRef<AbortController | null>(null);
  const history = useRef<string[] | null>(null);

  async function draw() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    history.current ??= readHistory();
    setBusy(true);
    setFailed(false);
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const query = new URLSearchParams();
      if (history.current.length)
        query.set("recent", history.current.join(","));
      const response = await fetchPublicAPI(`/locations/random?${query}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Random location unavailable");
      const data = RandomLocationResponseSchema.parse(await response.json());
      if (controller.signal.aborted)
        throw new Error("Random location interrupted");
      if (data.location) {
        history.current = [
          ...history.current.filter((id) => id !== data.location!.id),
          data.location.id,
        ].slice(-10);
        try {
          sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.current));
        } catch {
          /* Memory history remains usable when storage is blocked. */
        }
      }
      setResult(data);
    } catch {
      // Unmount cleanup clears ownership below; a timeout keeps the previous result.
      if (active.current === controller) setFailed(true);
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  return { result, busy, failed, draw };
}
