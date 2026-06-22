"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { parseDriveDocUrl, parseDriveFolderUrl } from "@/lib/drive-folder";
import { pickDriveFolder, hasGooglePickerEnv } from "@/lib/google/picker";
import {
  useGoogleAccessToken,
  useGoogleSignedIn,
} from "@/lib/google/use-google-access-token";
import { useProjects } from "@/lib/projects-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Project } from "@/lib/types";
import { DocIcon, FolderIcon } from "@/components/icons";

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
  const accessToken = useGoogleAccessToken();
  const signedIn = useGoogleSignedIn();

  const [folderEditing, setFolderEditing] = useState(false);
  const [docEditing, setDocEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteName, setPasteName] = useState("");

  const folder = project.driveFolder ?? null;
  const docs = project.driveDocs ?? [];
  const canPick = Boolean(hasSupabaseEnv && signedIn && accessToken && hasGooglePickerEnv());

  function resetForm() {
    setPasteUrl("");
    setPasteName("");
    setError(null);
  }

  async function handlePickFolder() {
    setError(null);
    if (!accessToken) {
      setFolderEditing(true);
      return;
    }
    setBusy(true);
    try {
      const picked = await pickDriveFolder(accessToken);
      if (picked) {
        setProjectDriveFolder(project.id, picked);
        setFolderEditing(false);
        resetForm();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open Google Picker.");
      setFolderEditing(true);
    } finally {
      setBusy(false);
    }
  }

  function handleSaveFolder() {
    setError(null);
    const link = parseDriveFolderUrl(pasteUrl, pasteName || project.name);
    if (!link) {
      setError("That doesn't look like a Drive folder link.");
      return;
    }
    setProjectDriveFolder(project.id, link);
    setFolderEditing(false);
    resetForm();
  }

  function handleSaveDoc() {
    setError(null);
    const link = parseDriveDocUrl(pasteUrl, pasteName || "Google Doc");
    if (!link) {
      setError("That doesn't look like a Google Doc link.");
      return;
    }
    addProjectDriveDoc(project.id, link);
    setDocEditing(false);
    resetForm();
  }

  return (
    <aside className="rounded-xl border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24">
      <h2 className="font-display text-sm font-semibold text-ink">Links</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        Folders and docs you chose in Google Drive.
      </p>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Folder</span>
          {folder && !folderEditing && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setPasteName(folder.name);
                  setPasteUrl(folder.url);
                  setFolderEditing(true);
                  setDocEditing(false);
                }}
                className="text-muted hover:text-ink"
              >
                Change
              </button>
              <span className="text-line">·</span>
              <button
                type="button"
                onClick={() => {
                  removeProjectDriveFolder(project.id);
                  setFolderEditing(false);
                }}
                className="text-muted hover:text-ink"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {folder && !folderEditing ? (
          <LinkRow icon={<FolderIcon className="h-4 w-4" />} name={folder.name} url={folder.url} />
        ) : folderEditing ? (
          <LinkForm
            busy={busy}
            canPick={canPick}
            error={error}
            pasteName={pasteName}
            pasteUrl={pasteUrl}
            pickLabel={busy ? "Opening Drive…" : "Browse Drive"}
            placeholder="https://drive.google.com/drive/folders/…"
            namePlaceholder="Name (optional)"
            onPick={handlePickFolder}
            onSave={handleSaveFolder}
            onCancel={() => {
              setFolderEditing(false);
              resetForm();
            }}
            onPasteUrl={setPasteUrl}
            onPasteName={setPasteName}
            signedIn={signedIn}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setFolderEditing(true);
              setDocEditing(false);
              resetForm();
            }}
            className="mt-2 w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-xs text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            + Link a folder
          </button>
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

        {docEditing ? (
          <div className="mt-2">
            <LinkForm
              busy={false}
              canPick={false}
              error={error}
              pasteName={pasteName}
              pasteUrl={pasteUrl}
              placeholder="https://docs.google.com/document/d/…"
              namePlaceholder="Doc name (optional)"
              onSave={handleSaveDoc}
              onCancel={() => {
                setDocEditing(false);
                resetForm();
              }}
              onPasteUrl={setPasteUrl}
              onPasteName={setPasteName}
              signedIn={signedIn}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDocEditing(true);
              setFolderEditing(false);
              resetForm();
            }}
            className="mt-2 w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-xs text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            + Link a doc
          </button>
        )}
      </section>
    </aside>
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

function LinkForm({
  busy,
  canPick,
  error,
  pasteUrl,
  pasteName,
  pickLabel,
  placeholder,
  namePlaceholder,
  onPick,
  onSave,
  onCancel,
  onPasteUrl,
  onPasteName,
  signedIn,
}: {
  busy: boolean;
  canPick: boolean;
  error: string | null;
  pasteUrl: string;
  pasteName: string;
  pickLabel?: string;
  placeholder: string;
  namePlaceholder: string;
  onPick?: () => void;
  onSave: () => void;
  onCancel: () => void;
  onPasteUrl: (v: string) => void;
  onPasteName: (v: string) => void;
  signedIn: boolean;
}) {
  return (
    <div className="mt-2 space-y-2">
      {canPick && onPick && (
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs font-medium text-ink hover:border-accent disabled:opacity-60"
        >
          {pickLabel}
        </button>
      )}
      {!canPick && hasSupabaseEnv && !signedIn && onPick && (
        <p className="text-[11px] text-muted">
          <Link href="/login" className="text-accent hover:text-accent-ink">
            Sign in
          </Link>{" "}
          to browse Drive, or paste a link.
        </p>
      )}
      <input
        type="url"
        value={pasteUrl}
        onChange={(e) => onPasteUrl(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-ink placeholder:text-muted/70"
      />
      <input
        type="text"
        value={pasteName}
        onChange={(e) => onPasteName(e.target.value)}
        placeholder={namePlaceholder}
        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-ink placeholder:text-muted/70"
      />
      {error && <p className="text-[11px] text-[#bc6740]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-ink"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
