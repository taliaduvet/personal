/**
 * Local (non-push) OS notification — fires whenever this tab's JS is alive,
 * even if the browser window is unfocused or sitting on another display.
 * Distinct from src/lib/push.ts, which needs a live server + service worker
 * and is meant to reach the user with the tab fully closed.
 */
export function notifyBrowser(title: string, body?: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "studio-os-session-nudge" });
  } catch {
    /* ignore */
  }
}
