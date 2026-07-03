/**
 * Open an external URL in a new tab with safe defaults.
 * Prefer this over raw window.open() to ensure noopener/noreferrer.
 */
export function openExternalUrl(url: string): void {
  // eslint-disable-next-line no-restricted-properties -- canonical wrapper for external URLs
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a blank window for printing/rendering content.
 * Use sparingly; prefer in-app preview when possible.
 */
export function openBlankWindow(): Window | null {
  // eslint-disable-next-line no-restricted-properties -- canonical wrapper for blank window
  return window.open();
}
