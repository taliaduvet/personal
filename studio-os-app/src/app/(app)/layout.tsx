import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { GoogleGsiPreload } from "@/components/GoogleGsiPreload";
import { SessionEndSheet } from "@/components/SessionEndSheet";
import { SessionIndicator } from "@/components/SessionIndicator";
import { TasksProvider } from "@/lib/store";
import { SettingsProvider } from "@/lib/settings-store";
import { ProjectsProvider } from "@/lib/projects-store";
import { SessionsProvider } from "@/lib/sessions-store";
import { SheetProvider } from "@/lib/sheet-store";
import { WeekPlanningLauncherProvider } from "@/components/WeekPlanningLauncher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ProjectsProvider>
      <TasksProvider>
      <SessionsProvider>
      <SheetProvider>
      <WeekPlanningLauncherProvider>
      <GoogleGsiPreload />
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
      </WeekPlanningLauncherProvider>
      </SheetProvider>
      </SessionsProvider>
      </TasksProvider>
      </ProjectsProvider>
    </SettingsProvider>
  );
}
