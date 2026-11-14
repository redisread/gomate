import { clearSignedOutTeamCreate } from "./team-create-operation";

const CHANNEL = "gomate.team-create.logout";
const epochKey = (userId: string) => `${CHANNEL}.${encodeURIComponent(userId)}`;

function currentEpoch(userId: string): string | null {
  try { return window.localStorage.getItem(epochKey(userId)); } catch { return null; }
}

/** The shared marker contains only a user ID in its key and an opaque epoch. */
export function synchronizeTeamCreateLogout(userId: string): boolean {
  const epoch = currentEpoch(userId);
  if (!epoch || window.sessionStorage.getItem(epochKey(userId)) === epoch) return false;
  clearSignedOutTeamCreate(window.sessionStorage, userId);
  window.sessionStorage.setItem(epochKey(userId), epoch);
  return true;
}

/** Call only after the server confirms sign-out, never on a failed/unknown result. */
export function publishTeamCreateLogout(userId: string) {
  const epoch = crypto.randomUUID();
  try { window.localStorage.setItem(epochKey(userId), epoch); } catch { /* Broadcast and visibility checks remain available. */ }
  window.dispatchEvent(new CustomEvent(CHANNEL, { detail: { userId, epoch } }));
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage({ userId, epoch });
      channel.close();
    }
  } catch { /* Storage events and visibility checks remain available. */ }
}

export function watchTeamCreateLogout(userId: string, invalidate: () => void): () => void {
  let observedEpoch = currentEpoch(userId);
  const receive = (message: unknown) => {
    if (!message || typeof message !== "object" || !("userId" in message) || !("epoch" in message)
      || message.userId !== userId || typeof message.epoch !== "string") return;
    const latest = currentEpoch(userId);
    // Ignore an old queued signal after a newer logout/login has been observed.
    if (latest && latest !== message.epoch) return;
    if (observedEpoch === message.epoch) return;
    observedEpoch = message.epoch;
    try {
      clearSignedOutTeamCreate(window.sessionStorage, userId);
      window.sessionStorage.setItem(epochKey(userId), message.epoch);
    } catch { /* In-memory cleanup still runs if storage is unavailable. */ }
    finally {
      // Even inaccessible storage must not leave private state visible in memory.
      invalidate();
    }
  };
  const onLocal = (event: Event) => receive((event as CustomEvent).detail);
  const onStorage = (event: StorageEvent) => {
    if (event.key === epochKey(userId) && event.newValue) receive({ userId, epoch: event.newValue });
  };
  const onResume = () => {
    const epoch = currentEpoch(userId);
    if (epoch) receive({ userId, epoch });
  };
  let channel: BroadcastChannel | null = null;
  try { if (typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(CHANNEL); }
  catch { /* Storage events and visibility checks remain available. */ }
  if (channel) channel.onmessage = (event) => receive(event.data);
  window.addEventListener(CHANNEL, onLocal);
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", onResume);
  window.addEventListener("focus", onResume);
  document.addEventListener("visibilitychange", onResume);
  return () => {
    channel?.close();
    window.removeEventListener(CHANNEL, onLocal);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onResume);
    window.removeEventListener("focus", onResume);
    document.removeEventListener("visibilitychange", onResume);
  };
}
