import type { Contact } from "./sheet/app-data";
import type { Task } from "./types";

export type ProjectPerson = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  /** Explicitly on the project vs only assigned on a task. */
  attached: boolean;
  viaTask: boolean;
};

export function collectProjectPeople(
  projectId: string,
  personIds: string[],
  tasks: Task[],
  contacts: Contact[]
): ProjectPerson[] {
  const attached = new Set(personIds);
  const viaTask = new Set<string>();
  for (const t of tasks) {
    if (t.projectId === projectId && t.personId) viaTask.add(t.personId);
  }

  const allIds = new Set([...attached, ...viaTask]);
  const byContact = Object.fromEntries(contacts.map((c) => [c.id, c]));

  return [...allIds]
    .map((id) => {
      const c = byContact[id];
      const taskName = tasks.find((t) => t.projectId === projectId && t.personId === id)?.personName;
      return {
        id,
        name: c?.name ?? taskName ?? "Unknown",
        email: c?.email ?? null,
        phone: c?.phone ?? null,
        attached: attached.has(id),
        viaTask: viaTask.has(id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function contactDetail(c: { email?: string | null; phone?: string | null }): string | undefined {
  const parts = [c.email?.trim(), c.phone?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : undefined;
}
