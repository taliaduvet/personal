import { SHEET_RANGES, TAB } from "./schema";

export const SPREADSHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
export const SPREADSHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type BatchGetResponse = {
  valueRanges?: { range?: string; values?: unknown[][] }[];
};

type SpreadsheetMeta = {
  properties?: { title?: string };
};

async function sheetsFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    let message = `Sheets API error (${res.status})`;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (body) message = body.slice(0, 200);
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchSpreadsheetTitle(
  sheetId: string,
  token: string
): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`;
  const data = await sheetsFetch<SpreadsheetMeta>(url, token);
  return data.properties?.title?.trim() || "Studio OS Sheet";
}

export type SheetRawData = {
  tasks: unknown[][];
  projects: unknown[][];
  settings: unknown[][];
  appData: unknown[][];
};

function tabNameFromRange(range: string): string {
  const tab = range.split("!")[0] ?? range;
  return tab.replace(/^'|'$/g, "");
}

export async function fetchSheetData(
  sheetId: string,
  token: string
): Promise<SheetRawData> {
  const ranges = [SHEET_RANGES.tasks, SHEET_RANGES.projects, SHEET_RANGES.settings, SHEET_RANGES.appData];
  const params = new URLSearchParams();
  for (const r of ranges) params.append("ranges", r);
  params.set("majorDimension", "ROWS");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${params}`;
  const data = await sheetsFetch<BatchGetResponse>(url, token);

  const byRange = new Map<string, unknown[][]>();
  for (const vr of data.valueRanges ?? []) {
    if (vr.range) byRange.set(tabNameFromRange(vr.range), vr.values ?? []);
  }

  return {
    tasks: byRange.get(TAB.TASKS) ?? [],
    projects: byRange.get(TAB.PROJECTS) ?? [],
    settings: byRange.get(TAB.SETTINGS) ?? [],
    appData: byRange.get(TAB.APP_DATA) ?? [],
  };
}

type BatchUpdateBody = {
  valueInputOption: "USER_ENTERED";
  data: { range: string; values: unknown[][] }[];
};

export async function batchUpdateValues(
  sheetId: string,
  token: string,
  updates: { range: string; values: unknown[][] }[]
): Promise<void> {
  if (updates.length === 0) return;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`;
  const body: BatchUpdateBody = {
    valueInputOption: "USER_ENTERED",
    data: updates,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `Sheets write error (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
}

export async function appendTaskRows(
  sheetId: string,
  token: string,
  rows: unknown[][]
): Promise<void> {
  if (rows.length === 0) return;

  const range = `${TAB.TASKS}!A:O`;
  const params = new URLSearchParams({
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
  });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?${params}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `Sheets append error (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
}
