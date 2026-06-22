"use client";

import { useState } from "react";
import type { LifeArea } from "@/lib/types";
import type { ProjectDraft } from "@/lib/projects-store";

type Props = {
  lifeAreas: LifeArea[];
  initial?: Partial<ProjectDraft>;
  submitLabel?: string;
  onSubmit: (draft: ProjectDraft) => void;
  onCancel?: () => void;
};

export function ProjectForm({
  lifeAreas,
  initial,
  submitLabel = "Save project",
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [lifeAreaId, setLifeAreaId] = useState(initial?.lifeAreaId ?? lifeAreas[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a project name.");
      return;
    }
    if (!lifeAreaId) {
      setError("Pick a life area.");
      return;
    }
    setError(null);
    onSubmit({ name: trimmed, why: why.trim() || null, lifeAreaId });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-accent/30 bg-accent-soft/15 p-4">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring EP, Day job, etc."
          className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          autoFocus
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">Life area</span>
        <select
          value={lifeAreaId}
          onChange={(e) => setLifeAreaId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          {lifeAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">Why (optional)</span>
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={2}
          placeholder="What is this initiative for?"
          className="mt-1 w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </label>
      {error && <p className="mt-2 text-xs text-[#bc6740]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
