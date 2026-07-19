import { batchUpdateValues } from "./client";
import type { ExportSpec } from "./export";

/**
 * Write an ExportSpec to a brand-new spreadsheet in the user's Drive.
 * Returns the new spreadsheet's id + URL. Uses the same Sheets scope the
 * app already holds — creating a file this way makes the app its owner
 * under drive.file semantics.
 */

type CreateResponse = {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
};

export async function writeExportSpreadsheet(
  spec: ExportSpec,
  token: string
): Promise<{ id: string; url: string }> {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: spec.title },
      sheets: spec.tabs.map((tab) => ({ properties: { title: tab.title } })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `Could not create the export spreadsheet (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const created = (await res.json()) as CreateResponse;
  const id = created.spreadsheetId;
  if (!id) throw new Error("Sheets API returned no spreadsheet id.");

  await batchUpdateValues(
    id,
    token,
    spec.tabs
      .filter((tab) => tab.rows.length > 0)
      .map((tab) => ({ range: `'${tab.title}'!A1`, values: tab.rows }))
  );

  return {
    id,
    url: created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${id}/edit`,
  };
}
