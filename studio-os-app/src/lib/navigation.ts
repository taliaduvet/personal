import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const RETURN_KEY = "studio-os.returnTo";

export function isTodayPath(path: string): boolean {
  return path === "/today" || path === "/design/today" || path.startsWith("/design/today/");
}

/** Return path saved when opening Work View — still set until back navigation clears it. */
export function getSavedReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(RETURN_KEY);
}

/** Remember where the user was before opening a task — survives refresh. */
export function rememberReturnPath() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname + window.location.search;
  if (/^\/tasks\/[^/]+$/.test(path)) return;
  if (/^\/projects\/[^/]+$/.test(path)) return;
  sessionStorage.setItem(RETURN_KEY, path);
}

export function openTaskWork(router: AppRouterInstance, taskId: string) {
  rememberReturnPath();
  router.push(`/tasks/${taskId}`);
}

export function returnFromTaskWork(router: AppRouterInstance, fallback = "/tasks") {
  const saved = sessionStorage.getItem(RETURN_KEY);
  if (saved) {
    sessionStorage.removeItem(RETURN_KEY);
    router.push(saved);
    return;
  }
  const idx = window.history.state?.idx;
  if (typeof idx === "number" && idx > 0) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export function openProjectDetail(router: AppRouterInstance, projectId: string) {
  rememberReturnPath();
  router.push(`/projects/${projectId}`);
}

export function returnFromProjectDetail(router: AppRouterInstance, fallback = "/projects") {
  returnFromTaskWork(router, fallback);
}
