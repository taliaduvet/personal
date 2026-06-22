import { CALENDAR_WRITE_SCOPE } from "@/lib/calendar/calendar-write";
import { SPREADSHEETS_SCOPE } from "@/lib/sheet/client";

export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
/** Read + create/update personal contacts (People API). */
export const CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts";
export const CONTACTS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/contacts.readonly";

export const GOOGLE_UNIFIED_SCOPES = [
  SPREADSHEETS_SCOPE,
  CALENDAR_WRITE_SCOPE,
  DRIVE_READONLY_SCOPE,
  CONTACTS_SCOPE,
].join(" ");
