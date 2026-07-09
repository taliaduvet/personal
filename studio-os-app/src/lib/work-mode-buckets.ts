export type MakeManageBucket = "make" | "manage";

/** Creative + outreach → make; admin + errands → manage (v1 heuristic). */
export function makeManageBucket(workModeId: string | null): MakeManageBucket | null {
  if (!workModeId) return null;
  if (workModeId === "creative" || workModeId === "outreach") return "make";
  if (workModeId === "admin" || workModeId === "errands") return "manage";
  return null;
}
