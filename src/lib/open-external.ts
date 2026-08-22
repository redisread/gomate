/**
 * Open an external link in a new tab.
 *
 * Used for sharing to third-party platforms (WeChat, Weibo, etc.)
 * where React Router navigation is not applicable.
 */
 
export function openExternalLink(url: string): void {
  // eslint-disable-next-line no-restricted-properties -- wrapper function for safe external navigation
  window.open(url, "_blank", "noopener,noreferrer");
}
