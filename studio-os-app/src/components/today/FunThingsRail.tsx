"use client";

import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/local-date";
import {
  EMPTY_FUN_THINGS_STATE,
  activeFunThings,
  addFunThing,
  archiveFunThing,
  funThingDoneOnDate,
  loadFunThingsState,
  saveFunThingsState,
  toggleFunThingToday,
  type FunThingsState,
} from "@/lib/fun-things";

/**
 * Always-on "Fun things" list in the Today rail. Not tasks: it has its own
 * storage and never touches the bench, the Lot, or week planning.
 */
export function FunThingsRail() {
  const [state, setState] = useState<FunThingsState>(EMPTY_FUN_THINGS_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    setState(loadFunThingsState());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  // Read-modify-write against on-disk state so another tab's edit isn't clobbered.
  function mutate(fn: (s: FunThingsState) => FunThingsState) {
    const next = fn(loadFunThingsState());
    saveFunThingsState(next);
    setState(next);
  }

  const today = localDateKey(new Date());
  const things = activeFunThings(state);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    mutate((s) => addFunThing(s, v));
    setText("");
  };

  return (
    <section
      aria-label="Fun things"
      className="space-y-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-ink">✦ Fun things</p>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-[10px] text-accent hover:underline"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <p className="text-[10px] leading-snug text-muted">
        Just for you — not tasks, nothing to finish.
      </p>

      {things.length === 0 ? (
        <p className="text-[11px] text-faint">Add something you love doing.</p>
      ) : (
        <ul className="space-y-1">
          {things.map((t) => {
            const done = funThingDoneOnDate(state, t.id, today);
            return (
              <li key={t.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => mutate((s) => toggleFunThingToday(s, t.id))}
                  aria-pressed={done}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-surface/70"
                >
                  <span
                    className={[
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[10px] leading-none",
                      done ? "border-accent bg-accent text-white" : "border-faint bg-surface",
                    ].join(" ")}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span className={["truncate text-xs", done ? "text-faint" : "text-ink"].join(" ")}>
                    {t.name}
                  </span>
                </button>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => mutate((s) => archiveFunThing(s, t.id))}
                    aria-label={`Remove ${t.name}`}
                    className="shrink-0 px-1 text-xs text-faint hover:text-ink"
                  >
                    ×
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editing || things.length === 0 ? (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="add a fun thing…"
            aria-label="Add a fun thing"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}
