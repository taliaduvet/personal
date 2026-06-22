export function slugFromName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

export function uniqueId(prefix: string, name: string, existing: Set<string>): string {
  const base = `${prefix}-${slugFromName(name)}`;
  if (!existing.has(base)) return base;
  return `${base}-${Date.now()}`;
}
