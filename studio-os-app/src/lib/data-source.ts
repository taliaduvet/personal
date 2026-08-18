/**
 * Studio OS vault ownership.
 *
 * - "local" — device-only (no cloud cutover yet; sheet may still be connected)
 * - "sheet" — legacy; sheet was explicit source of truth
 * - "cloud" — app + Supabase is primary; sheet writeback stays frozen
 */

export type DataSource = "local" | "sheet" | "cloud";

export const DATA_SOURCE_KEY = "studio-os.data-source.v1";
export const DATA_SOURCE_EVENT = "studio-os:data-source";

export function getDataSource(): DataSource {
  if (typeof window === "undefined") return "local";
  try {
    const raw = localStorage.getItem(DATA_SOURCE_KEY);
    if (raw === "cloud" || raw === "sheet" || raw === "local") return raw;
  } catch {
    /* ignore */
  }
  return "local";
}

export function isCloudPrimary(): boolean {
  return getDataSource() === "cloud";
}

export function setDataSource(source: DataSource): void {
  try {
    localStorage.setItem(DATA_SOURCE_KEY, source);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_SOURCE_EVENT, { detail: source }));
  }
}
