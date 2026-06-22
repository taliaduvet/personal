"use client";

import { useState } from "react";
import type { LifeArea } from "@/lib/types";
import { uniqueId } from "@/lib/slug-id";
import { useProjects } from "@/lib/projects-store";

const COLOR_PRESETS = ["#5b61e8", "#3c8262", "#bc6740", "#6a5dc0", "#3d6f9f", "#8b6914", "#c45c8a"];

type Props = {
  lifeAreas: LifeArea[];
  onSave: (area: LifeArea) => void;
  onRemove: (id: string) => string | null;
};

export function LifeAreasSettings({ lifeAreas, onSave, onRemove }: Props) {
  const { projects } = useProjects();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]!);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditingId("__new__");
    setName("");
    setColor(COLOR_PRESETS[lifeAreas.length % COLOR_PRESETS.length]!);
    setError(null);
  }

  function startEdit(area: LifeArea) {
    setEditingId(area.id);
    setName(area.name);
    setColor(area.color);
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setName("");
    setError(null);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name.");
      return;
    }
    const id =
      editingId === "__new__"
        ? uniqueId("area", trimmed, new Set(lifeAreas.map((a) => a.id)))
        : editingId!;
    onSave({ id, name: trimmed, color });
    cancel();
  }

  function remove(id: string) {
    if (projects.some((p) => p.lifeAreaId === id)) {
      setError("Move or delete projects in this area first.");
      return;
    }
    const err = onRemove(id);
    setError(err);
    if (!err && editingId === id) cancel();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Life areas</h2>
          <p className="mt-1 text-sm text-muted">
            The big buckets your projects live in — Music, Income, Health, and your own.
          </p>
        </div>
        {!editingId && (
          <button
            type="button"
            onClick={startNew}
            className="shrink-0 rounded-md border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-accent hover:border-accent/40"
          >
            + Add area
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {lifeAreas.map((area) => (
          <li
            key={area.id}
            className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: area.color }} />
            <span className="min-w-0 flex-1 text-sm font-medium text-ink">{area.name}</span>
            <button
              type="button"
              onClick={() => startEdit(area)}
              className="text-xs text-muted hover:text-ink"
            >
              Edit
            </button>
            {lifeAreas.length > 1 && (
              <button
                type="button"
                onClick={() => remove(area.id)}
                className="text-xs text-muted hover:text-danger"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {editingId && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent-soft/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">
            {editingId === "__new__" ? "New life area" : "Edit life area"}
          </p>
          <label className="mt-2 block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <div className="mt-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Color</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={[
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c ? "scale-110 border-ink" : "border-transparent",
                  ].join(" ")}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-border bg-canvas"
                aria-label="Custom color"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Save
            </button>
            <button type="button" onClick={cancel} className="text-xs text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#bc6740]">{error}</p>}
    </div>
  );
}
