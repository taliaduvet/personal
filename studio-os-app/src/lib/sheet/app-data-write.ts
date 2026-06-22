import { batchUpdateValues } from "./client";
import { APP_DATA_TAB, appDataRowsFromStore, type AppDataStore } from "./app-data";
import { TAB } from "./schema";

const CAL_API = "https://www.googleapis.com/calendar/v3";

export async function ensureAppDataTab(sheetId: string, token: string): Promise<void> {
  const meta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!meta.ok) return;
  const data = (await meta.json()) as { sheets?: { properties?: { title?: string } }[] };
  const titles = (data.sheets ?? []).map((s) => s.properties?.title);
  if (titles.includes(APP_DATA_TAB)) return;

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: APP_DATA_TAB, hidden: true } } }],
    }),
  });
}

export async function writeAppDataStore(
  sheetId: string,
  token: string,
  store: AppDataStore
): Promise<void> {
  await ensureAppDataTab(sheetId, token);
  const rows = appDataRowsFromStore(store);
  await batchUpdateValues(sheetId, token, [
    { range: `${TAB.APP_DATA}!A1:B${Math.max(rows.length, 2)}`, values: rows },
  ]);
}

/** Upsert a single key in _Settings (creates row if missing). */
export async function upsertSheetSetting(
  sheetId: string,
  token: string,
  key: string,
  value: string,
  existingRows?: unknown[][]
): Promise<void> {
  let rows = existingRows;
  if (!rows) {
    const raw = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${TAB.SETTINGS}!A1:B`)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = (await raw.json()) as { values?: unknown[][] };
    rows = data.values ?? [];
  }

  let rowNum = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i]?.[0] ?? "").trim() === key) {
      rowNum = i + 1;
      break;
    }
  }

  if (rowNum > 0) {
    await batchUpdateValues(sheetId, token, [
      { range: `${TAB.SETTINGS}!B${rowNum}`, values: [[value]] },
    ]);
  } else {
    const nextRow = Math.max(rows.length, 1) + 1;
    await batchUpdateValues(sheetId, token, [
      { range: `${TAB.SETTINGS}!A${nextRow}:B${nextRow}`, values: [[key, value]] },
    ]);
  }
}

export { CAL_API };
