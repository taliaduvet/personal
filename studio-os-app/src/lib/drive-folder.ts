import type { DriveDocLink, DriveFolderLink } from "./types";

const FOLDER_URL_RE =
  /^https?:\/\/(?:drive\.google\.com\/drive(?:\/u\/\d+)?\/folders\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9_-]+)/;

/** Build a standard Drive folder URL from an ID. */
export function driveFolderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** Parse a pasted Drive folder link into a link record. Returns null if invalid. */
export function parseDriveFolderUrl(
  input: string,
  name = "Drive folder"
): DriveFolderLink | null {
  const raw = input.trim();
  if (!raw) return null;

  let id: string | null = null;
  const match = raw.match(FOLDER_URL_RE);
  if (match) {
    id = match[1];
  } else if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) {
    id = raw;
  }
  if (!id) return null;

  const cleanName = name.trim() || "Drive folder";
  return {
    id,
    name: cleanName,
    url: driveFolderUrl(id),
    linkedAt: Date.now(),
  };
}

export function normalizeDriveFolderLink(raw: unknown): DriveFolderLink | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<DriveFolderLink>;
  if (typeof o.id !== "string" || !o.id) return null;
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Drive folder";
  const url = typeof o.url === "string" && o.url.trim() ? o.url.trim() : driveFolderUrl(o.id);
  return {
    id: o.id,
    name,
    url,
    parentPath: typeof o.parentPath === "string" ? o.parentPath : null,
    linkedAt: typeof o.linkedAt === "number" ? o.linkedAt : Date.now(),
  };
}

const DOC_URL_RE =
  /^https?:\/\/(?:docs\.google\.com\/document\/d\/|drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9_-]+)/;

export function driveDocUrl(id: string): string {
  return `https://docs.google.com/document/d/${id}/edit`;
}

export function parseDriveDocUrl(input: string, name = "Google Doc"): DriveDocLink | null {
  const raw = input.trim();
  if (!raw) return null;

  let id: string | null = null;
  const match = raw.match(DOC_URL_RE);
  if (match) {
    id = match[1];
  } else if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) {
    id = raw;
  }
  if (!id) return null;

  const cleanName = name.trim() || "Google Doc";
  return {
    id,
    name: cleanName,
    url: raw.startsWith("http") ? raw.split("?")[0] : driveDocUrl(id),
    linkedAt: Date.now(),
  };
}

export function normalizeDriveDocLink(raw: unknown): DriveDocLink | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<DriveDocLink>;
  if (typeof o.id !== "string" || !o.id) return null;
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Google Doc";
  const url = typeof o.url === "string" && o.url.trim() ? o.url.trim() : driveDocUrl(o.id);
  return {
    id: o.id,
    name,
    url,
    linkedAt: typeof o.linkedAt === "number" ? o.linkedAt : Date.now(),
  };
}
