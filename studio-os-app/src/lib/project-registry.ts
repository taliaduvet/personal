import type { Project } from "./types";
import { PROJECTS as SEED_PROJECTS } from "./sample-data";

/** Live project list — updated by ProjectsProvider after sheet sync. */
let activeProjects: Project[] = SEED_PROJECTS;

export function setActiveProjects(projects: Project[]) {
  activeProjects = projects;
}

export function getActiveProjects(): Project[] {
  return activeProjects;
}

export function activeProjectById(id: string): Project | undefined {
  return activeProjects.find((p) => p.id === id);
}

export function activeProjectName(id: string | null): string {
  if (!id) return "No project";
  return activeProjectById(id)?.name ?? "Unknown project";
}

export function activeProjectWhy(id: string | null): string | null {
  if (!id) return null;
  return activeProjectById(id)?.why ?? null;
}
