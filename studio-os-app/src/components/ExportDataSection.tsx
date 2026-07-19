"use client";

import { useState } from "react";
import { useTasks } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { useSettings } from "@/lib/settings-store";
import { buildExportSpec } from "@/lib/sheet/export";
import { writeExportSpreadsheet } from "@/lib/sheet/export-write";
import { getSheetsAccessToken } from "@/lib/google/sheets-auth";

/**
 * One-shot "export my data" card: builds a fresh spreadsheet in the user's
 * Drive with every tab of app data. The offboarding half of the funnel —
 * arrive from a sheet, leave back to a sheet.
 */
export function ExportDataSection() {
  const { tasks, recipes, activityLog, reviewNotes, logbookLines } = useTasks();
  const { projects } = useProjects();
  const { lifeAreas } = useSettings();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runExport() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const token = getSheetsAccessToken();
      if (!token) {
        throw new Error("Connect your Google account above first — export writes a new sheet to your Drive.");
      }
      const spec = buildExportSpec({
        tasks,
        projects,
        recipes,
        activityLog,
        reviewNotes,
        logbookLines,
        lifeAreas,
      });
      const created = await writeExportSpreadsheet(spec, token);
      setResult({ url: created.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-base font-semibold text-ink">Export your data</h2>
      <p className="mt-1 text-sm text-muted">
        Creates a new Google Sheet in your Drive with your tasks, projects, sessions, reviews,
        logbook, and recipes. Your data is yours — take it with you anytime.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={runExport}
          disabled={busy}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink hover:border-accent disabled:opacity-60"
        >
          {busy ? "Exporting…" : "Export to Google Sheet"}
        </button>
        {result && (
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-accent hover:underline"
          >
            Open your export →
          </a>
        )}
      </div>
      {error && <p className="mt-2 text-xs leading-relaxed text-red-600">{error}</p>}
    </div>
  );
}
