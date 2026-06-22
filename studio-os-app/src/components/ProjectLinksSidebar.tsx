"use client";

import { useState, type ReactNode } from "react";
import { pickDriveDoc, pickDriveFolder, hasGooglePickerEnv } from "@/lib/google/picker";
import { connectGoogleUnified } from "@/lib/google/google-unified-auth";
import { getDriveAccessToken } from "@/lib/google/drive-auth";
import { useProjects } from "@/lib/projects-store";
import type { Project } from "@/lib/types";
import { DocIcon, FolderIcon } from "@/components/icons";
import { ProjectPeopleSection } from "@/components/ProjectPeopleSection";

type Props = {
  project: Project;
};

export function ProjectLinksSidebar({ project }: Props) {
  const {
    setProjectDriveFolder,
    removeProjectDriveFolder,
    addProjectDriveDoc,
    removeProjectDriveDoc,
  } = useProjects();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folder = project.driveFolder ?? null;
  const docs = project.driveDocs ?? [];
  const pickerReady = hasGooglePickerEnv();

  async function runPicker(kind: "folder" | "doc") {
    if (!pickerReady) {
      setError("Drive picker is not configured — add NEXT_PUBLIC_GOOGLE_API_KEY.");
      return;
    }

    try {
      let token = getDriveAccessToken();
      if (!token) {
        await connectGoogleUnified();
        token = getDriveAccessToken();
        if (!token) return; // redirect in progress
      }

      setBusy(true);
      setError(null);

      if (kind === "folder") {
        const picked = await pickDriveFolder(token);
        if (picked) setProjectDriveFolder(project.id, picked);
      } else {
        const picked = await pickDriveDoc(token);
        if (picked) addProjectDriveDoc(project.id, picked);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "REDIRECTING_TO_GOOGLE") return;
      setError(e instanceof Error ? e.message : "Could not open Google Drive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="rounded-xl border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24">
      <h2 className="font-display text-sm font-semibold text-ink">Project links</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        Drive folders, docs, and people tied to this initiative.
      </p>

      {error && <p className="mt-2 text-[11px] text-[#bc6740]">{error}</p>}

      <section className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Folder</span>
          {folder && (
            <button
              type="button"
              onClick={() => removeProjectDriveFolder(project.id)}
              className="text-[11px] text-muted hover:text-ink"
            >
              Remove
            </button>
          )}
        </div>

        {folder ? (
          <>
            <LinkRow icon={<FolderIcon className="h-4 w-4" />} name={folder.name} url={folder.url} />
            <button
              type="button"
              disabled={busy}
              onClick={() => runPicker("folder")}
              className="mt-2 text-xs text-accent hover:text-accent-ink disabled:opacity-60"
            >
              Change folder
            </button>
          </>
        ) : (
          <PickButton
            busy={busy}
            label={busy ? "Opening Drive…" : "Choose folder from Drive"}
            onClick={() => runPicker("folder")}
          />
        )}
      </section>

      <div className="my-4 border-t border-line" />

      <section>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Docs</span>

        {docs.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {docs.map((doc) => (
              <li key={doc.id} className="group relative">
                <LinkRow icon={<DocIcon className="h-4 w-4" />} name={doc.name} url={doc.url} />
                <button
                  type="button"
                  onClick={() => removeProjectDriveDoc(project.id, doc.id)}
                  className="absolute right-0 top-0 rounded px-1.5 py-0.5 text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
                  aria-label={`Remove ${doc.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <PickButton
          busy={busy}
          label={busy ? "Opening Drive…" : "+ Choose doc from Drive"}
          onClick={() => runPicker("doc")}
          className="mt-2"
        />
      </section>

      <div className="my-4 border-t border-line" />

      <ProjectPeopleSection project={project} />
    </aside>
  );
}

function PickButton({
  busy,
  label,
  onClick,
  className = "mt-2",
}: {
  busy: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={[
        className,
        "w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-xs font-medium transition-colors",
        busy ? "text-muted" : "text-muted hover:border-accent/50 hover:text-accent",
        "disabled:opacity-60",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function LinkRow({
  icon,
  name,
  url,
}: {
  icon: ReactNode;
  name: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2.5 rounded-lg border border-line bg-canvas/50 px-2.5 py-2 transition-colors hover:border-accent/30 hover:bg-accent-soft/40"
    >
      <span className="shrink-0 text-accent">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</span>
      <span className="shrink-0 text-xs text-muted" aria-hidden>
        ↗
      </span>
    </a>
  );
}
