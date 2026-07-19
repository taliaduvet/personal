"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { SessionEndSheet } from "@/components/SessionEndSheet";
import { SessionIndicator } from "@/components/SessionIndicator";
import { useSessions } from "@/lib/sessions-store";

function useGlobalWorkFocusMode(): boolean {
  const pathname = usePathname();
  const { activeSession } = useSessions();
  if (!activeSession) return false;
  const match = pathname.match(/^\/tasks\/([^/]+)$/);
  return match ? activeSession.taskId === match[1] : false;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const focusMode = useGlobalWorkFocusMode();

  useEffect(() => {
    document.body.classList.toggle("work-focus", focusMode);
    return () => document.body.classList.remove("work-focus");
  }, [focusMode]);

  if (focusMode) {
    return (
      <>
        <div className="flex min-h-dvh flex-col bg-canvas">
          <main className="flex min-h-dvh flex-1 flex-col">{children}</main>
        </div>
        <SessionEndSheet />
      </>
    );
  }

  return (
    <>
      <div className="md:grid md:min-h-dvh md:grid-cols-[256px_1fr]">
        <Sidebar />
        <div className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
        <BottomNav />
        <div className="fixed inset-x-0 bottom-[4.25rem] z-20 flex justify-center px-4 md:hidden">
          <SessionIndicator className="shadow-sm" />
        </div>
        <TaskDetailSheet />
        <SessionEndSheet />
      </div>
    </>
  );
}
