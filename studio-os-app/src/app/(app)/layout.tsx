import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { TasksProvider } from "@/lib/store";
import { SettingsProvider } from "@/lib/settings-store";
import { ProjectsProvider } from "@/lib/projects-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ProjectsProvider>
      <TasksProvider>
      <div className="md:grid md:min-h-dvh md:grid-cols-[256px_1fr]">
        <Sidebar />
        <div className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
        <BottomNav />
        <TaskDetailSheet />
      </div>
      </TasksProvider>
      </ProjectsProvider>
    </SettingsProvider>
  );
}
