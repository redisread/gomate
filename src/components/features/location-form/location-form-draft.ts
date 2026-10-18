import type { LocationFormData } from "./location-form-data";

const DRAFT_LIFETIME = 7 * 24 * 60 * 60 * 1_000;

function draftKey(locationId?: string): string {
  return `location-${locationId ? `edit-${locationId}` : "create"}-draft`;
}

// Browser drafts are optional. Storage can be denied or exhausted independently
// of the API, so its failures must not change the result of loading or saving.
export function removeLocationDraft(locationId?: string): void {
  try {
    localStorage.removeItem(draftKey(locationId));
  } catch {
    // Storage is unavailable; a later visit may still find the old draft.
  }
}

function writeDraft(
  data: LocationFormData,
  expiresAt: number,
  locationId?: string,
): void {
  try {
    localStorage.setItem(
      draftKey(locationId),
      JSON.stringify({ version: 3, expiresAt, data }),
    );
  } catch {
    // Keep editing possible when the browser cannot persist a recovery copy.
  }
}

export function saveLocationDraft(
  data: LocationFormData,
  locationId?: string,
): void {
  writeDraft(data, Date.now() + DRAFT_LIFETIME, locationId);
}

export function loadLocationDraft(
  locationId?: string,
): LocationFormData | null {
  try {
    const raw = localStorage.getItem(draftKey(locationId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as {
      version?: number;
      expiresAt?: number;
      data?: LocationFormData;
    };
    if (
      (draft?.version === 2 || draft?.version === 3) &&
      draft.expiresAt &&
      draft.expiresAt > Date.now() &&
      draft.data
    ) {
      const data: LocationFormData = {
        ...draft.data,
        extra: {
          ...draft.data.extra,
          hiking: { bestSeasons: draft.data.extra.hiking?.bestSeasons ?? [] },
        },
      };
      // Normalize v2 without extending the original expiry. A failed rewrite
      // must not discard a draft that was successfully read.
      writeDraft(data, draft.expiresAt, locationId);
      return data;
    }
    removeLocationDraft(locationId);
  } catch {
    removeLocationDraft(locationId);
  }
  return null;
}
