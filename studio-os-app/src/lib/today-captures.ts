const STORAGE_KEY = "studio-os.today-captures";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getTodayCaptureChips(): string[] {
  return readAll()[todayDateKey()] ?? [];
}

export function addTodayCaptureChip(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return getTodayCaptureChips();
  const key = todayDateKey();
  const all = readAll();
  const prev = all[key] ?? [];
  const label = trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed;
  const next = [label, ...prev.filter((c) => c !== label)].slice(0, 8);
  all[key] = next;
  writeAll(all);
  return next;
}
