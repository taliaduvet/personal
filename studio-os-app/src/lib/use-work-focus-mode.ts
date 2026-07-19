"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSessions } from "@/lib/sessions-store";

/** True on Work View while this task has an active sit-with session. */
export function useWorkFocusMode(taskId?: string): boolean {
  const pathname = usePathname();
  const { activeSession } = useSessions();

  return useMemo(() => {
    if (!activeSession) return false;
    if (taskId) return activeSession.taskId === taskId;
    const match = pathname.match(/^\/tasks\/([^/]+)$/);
    return match ? activeSession.taskId === match[1] : false;
  }, [pathname, activeSession, taskId]);
}
