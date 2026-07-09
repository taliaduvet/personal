"use client";

import { useEffect, useRef, useState } from "react";
import { WORK_MODES } from "@/lib/sample-data";
import { useProjects } from "@/lib/projects-store";
import { classifyChipLabels } from "@/lib/parse";
import { lifeAreaColor, lifeAreaName } from "@/lib/lenses";
import { useSettings } from "@/lib/settings-store";
import { createGoogleContact, parseContactSearchQuery, type CreateContactInput } from "@/lib/google/contacts-auth";
import { getDriveAccessToken } from "@/lib/google/drive-auth";
import { DoPlanCalendar, DeadlineCalendar } from "@/components/DoPlanCalendar";
import type { DoPlan, Task } from "@/lib/types";

type FieldKey = "project" | "doing" | "deadline" | "mode" | "person";

type ClassifyTask = Pick<
  Task,
  "projectId" | "lifeAreaId" | "doPlan" | "deadlineInDays" | "workModeId" | "personId" | "personName"
>;

/**
 * Compact context row — one pill per field; tap opens a dropdown for just that field.
 */
export function TaskClassifyDropdowns({
  task,
  onChange,
  label = "Context",
}: {
  task: ClassifyTask;
  onChange: (patch: Partial<Task>) => void;
  label?: string;
}) {
  const { weekStartsOn, contacts, setGoogleContacts } = useSettings();
  const { projects } = useProjects();
  const [open, setOpen] = useState<FieldKey | null>(null);
  const [personQuery, setPersonQuery] = useState("");
  const [creatingContact, setCreatingContact] = useState(false);
  const [contactCreateError, setContactCreateError] = useState<string | null>(null);
  const personSearchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chips = classifyChipLabels(task, weekStartsOn);

  useEffect(() => {
    if (open !== "person") {
      setPersonQuery("");
      setContactCreateError(null);
    }
  }, [open]);

  useEffect(() => {
    if (open === "person") personSearchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (field: FieldKey) => setOpen((cur) => (cur === field ? null : field));

  const pickProject = (projectId: string | null) => {
    if (!projectId) onChange({ projectId: null });
    else {
      const p = projects.find((x) => x.id === projectId);
      if (p) onChange({ projectId: p.id, lifeAreaId: p.lifeAreaId });
    }
    setOpen(null);
  };

  const pickDoing = (plan: DoPlan) => {
    onChange({ doPlan: plan });
    setOpen(null);
  };

  const pickDeadline = (value: number | null) => {
    onChange({ deadlineInDays: value });
    setOpen(null);
  };

  const pickMode = (workModeId: string | null) => {
    onChange({ workModeId });
    setOpen(null);
  };

  const pickPerson = (id: string | null) => {
    const person = id ? contacts.find((c) => c.id === id) : null;
    onChange({ personId: id, personName: person?.name ?? null });
    setOpen(null);
  };

  const assignPersonName = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    onChange({ personId: null, personName: clean });
    setOpen(null);
  };

  const createPersonFromDraft = async (draft: CreateContactInput) => {
    if (!draft.name.trim()) return;

    const token = getDriveAccessToken();
    if (!token) {
      setContactCreateError("Connect Google in Settings first.");
      return;
    }

    setCreatingContact(true);
    setContactCreateError(null);
    try {
      const created = await createGoogleContact(token, draft);
      const next = [...contacts, created].sort((a, b) => a.name.localeCompare(b.name));
      setGoogleContacts(next);
      onChange({ personId: created.id, personName: created.name });
      setOpen(null);
    } catch (e) {
      setContactCreateError(e instanceof Error ? e.message : "Could not add contact");
    } finally {
      setCreatingContact(false);
    }
  };

  const showPerson = true;

  return (
    <div ref={rootRef}>
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <ContextPill
          active={open === "project"}
          dot={task.projectId ? lifeAreaColor(task.lifeAreaId) : undefined}
          accent={!!task.projectId}
          onClick={() => toggle("project")}
        >
          {chips.project ?? "Project"}
        </ContextPill>

        <ContextPill
          active={open === "doing"}
          onClick={() => toggle("doing")}
          filled={task.doPlan !== null}
        >
          {chips.doing ?? "Doing"}
        </ContextPill>

        <ContextPill
          active={open === "deadline"}
          danger={task.deadlineInDays !== null}
          onClick={() => toggle("deadline")}
        >
          {chips.deadline ?? "Deadline"}
        </ContextPill>

        <ContextPill active={open === "mode"} onClick={() => toggle("mode")} filled={!!task.workModeId}>
          {chips.mode ?? "Mode"}
        </ContextPill>

        {showPerson && (
          <ContextPill active={open === "person"} onClick={() => toggle("person")} filled={!!task.personName}>
            {task.personName ?? "Person"}
          </ContextPill>
        )}
      </div>

      {open === "project" && (
        <DropdownPanel title="Project">
          {projects.map((p) => (
            <DropdownOption
              key={p.id}
              selected={task.projectId === p.id}
              dot={lifeAreaColor(p.lifeAreaId)}
              title={p.name}
              subtitle={p.why ?? undefined}
              onClick={() => pickProject(p.id)}
            />
          ))}
          <DropdownOption selected={!task.projectId} dot="#8b95a1" title="None" onClick={() => pickProject(null)} />
        </DropdownPanel>
      )}

      {open === "doing" && (
        <div className="mt-2">
          <DoPlanCalendar
            value={task.doPlan}
            weekStartsOn={weekStartsOn}
            onChange={pickDoing}
          />
        </div>
      )}

      {open === "deadline" && (
        <div className="mt-2">
          <DeadlineCalendar
            deadlineInDays={task.deadlineInDays}
            weekStartsOn={weekStartsOn}
            onChange={pickDeadline}
          />
        </div>
      )}

      {open === "mode" && (
        <DropdownPanel title="Mode">
          {WORK_MODES.map((m) => (
            <DropdownOption
              key={m.id}
              selected={task.workModeId === m.id}
              title={m.name}
              onClick={() => pickMode(m.id)}
            />
          ))}
          <DropdownOption selected={!task.workModeId} title="None" onClick={() => pickMode(null)} />
        </DropdownPanel>
      )}

      {open === "person" && (
        <PersonSearchPanel
          query={personQuery}
          onQueryChange={setPersonQuery}
          inputRef={personSearchRef}
          contacts={contacts}
          selectedId={task.personId}
          onPick={pickPerson}
          onAssignName={assignPersonName}
          onCreate={createPersonFromDraft}
          creating={creatingContact}
          createError={contactCreateError}
        />
      )}

      {task.projectId && (
        <p className="mt-1.5 text-xs text-faint">{lifeAreaName(task.lifeAreaId)} · inherited from project</p>
      )}
    </div>
  );
}

function contactSubtitle(c: { email?: string | null; phone?: string | null }): string | undefined {
  const parts = [c.email?.trim(), c.phone?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : undefined;
}

function PersonSearchPanel({
  query,
  onQueryChange,
  inputRef,
  contacts,
  selectedId,
  onPick,
  onAssignName,
  onCreate,
  creating = false,
  createError = null,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  contacts: { id: string; name: string; email?: string | null; phone?: string | null }[];
  selectedId?: string | null;
  onPick: (id: string | null) => void;
  onAssignName: (name: string) => void;
  onCreate: (draft: CreateContactInput) => void;
  creating?: boolean;
  createError?: string | null;
}) {
  const q = query.trim().toLowerCase();
  const qRaw = query.trim();
  const selected = selectedId ? contacts.find((c) => c.id === selectedId) : null;
  const filtered = q
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.phone?.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ?? false)
      )
    : [];
  const parsed = parseContactSearchQuery(qRaw);
  const showAddForm = Boolean(q && filtered.length === 0 && parsed.name);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");

  useEffect(() => {
    if (!showAddForm) return;
    setDraftName(parsed.name);
    if (parsed.email) setDraftEmail(parsed.email);
  }, [showAddForm, parsed.name, parsed.email, qRaw]);

  return (
    <div className="mt-2 rounded-xl border border-border bg-surface p-2 shadow-sm">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-faint">Person</p>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Name or search contacts…"
        className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
      />
      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        <DropdownOption selected={!selectedId} title="None" onClick={() => onPick(null)} />
        {!q && selected && (
          <DropdownOption
            selected
            title={selected.name}
            subtitle={contactSubtitle(selected)}
            onClick={() => onPick(selected.id)}
          />
        )}
        {!q && !selected && (
          <li className="px-3 py-2 text-xs text-muted">Type a name — use it on this task or search contacts.</li>
        )}
        {qRaw.length > 0 && (
          <DropdownOption
            selected={!selectedId && selected?.name?.toLowerCase() === qRaw.toLowerCase()}
            title={`Use "${qRaw}" on this task`}
            subtitle="No contact needed"
            onClick={() => onAssignName(qRaw)}
          />
        )}
        {showAddForm && (
          <li className="px-2 pt-1">
            <div className="rounded-lg border border-dashed border-accent/40 bg-accent-soft/20 p-3">
              <p className="text-xs font-semibold text-accent">Add to Google Contacts</p>
              <label className="mt-2 block">
                <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Name</span>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                  autoComplete="name"
                />
              </label>
              <label className="mt-2 block">
                <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Email</span>
                <input
                  type="email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-md border border-border bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
                  autoComplete="email"
                />
              </label>
              <label className="mt-2 block">
                <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Phone</span>
                <input
                  type="tel"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-md border border-border bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
                  autoComplete="tel"
                />
              </label>
              <button
                type="button"
                disabled={creating || !draftName.trim()}
                onClick={() =>
                  onCreate({
                    name: draftName.trim(),
                    email: draftEmail.trim() || null,
                    phone: draftPhone.trim() || null,
                  })
                }
                className="mt-3 w-full rounded-lg border border-accent/50 bg-accent-soft/50 px-3 py-2 text-sm font-medium text-accent hover:border-accent disabled:opacity-60"
              >
                {creating ? "Saving to Google…" : "Save contact & assign"}
              </button>
            </div>
            {createError && <p className="mt-1 px-1 text-xs text-danger">{createError}</p>}
          </li>
        )}
        {q && filtered.length === 0 && !parsed.name && (
          <li className="px-3 py-2 text-xs text-muted">Enter a name or email to search or add.</li>
        )}
        {filtered.slice(0, 20).map((c) => (
          <DropdownOption
            key={c.id}
            selected={selectedId === c.id}
            title={c.name}
            subtitle={contactSubtitle(c)}
            onClick={() => onPick(c.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ContextPill({
  children,
  onClick,
  active = false,
  dot,
  accent = false,
  danger = false,
  filled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  dot?: string;
  accent?: boolean;
  danger?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : danger
            ? "border-danger/30 text-danger hover:border-danger/50"
            : accent
              ? "border-accent/30 text-accent hover:border-accent/50"
              : filled
                ? "border-border bg-canvas text-muted hover:border-accent hover:text-ink"
                : "border-border text-faint hover:border-accent hover:text-muted",
      ].join(" ")}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
      <Chevron open={active} />
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-3 w-3 shrink-0 opacity-60 transition-transform", open ? "rotate-180" : ""].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DropdownPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 rounded-xl border border-border bg-surface p-2 shadow-sm">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</p>
      {hint && <p className="px-2 pb-1 text-[11px] text-muted">{hint}</p>}
      <ul className="mt-1 space-y-1">{children}</ul>
    </div>
  );
}

function DropdownOption({
  title,
  subtitle,
  selected,
  dot,
  danger = false,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  dot?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
          selected
            ? danger
              ? "border-danger/40 bg-danger/5"
              : "border-accent/40 bg-accent-soft/60"
            : "border-transparent hover:border-border hover:bg-canvas",
        ].join(" ")}
      >
        {dot && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
        <span className="min-w-0 flex-1">
          <span className={["block text-sm font-medium", danger && selected ? "text-danger" : "text-ink"].join(" ")}>
            {title}
          </span>
          {subtitle && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{subtitle}</span>}
        </span>
        {selected && (
          <svg viewBox="0 0 24 24" className={["mt-0.5 h-4 w-4 shrink-0", danger ? "text-danger" : "text-accent"].join(" ")} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        )}
      </button>
    </li>
  );
}
