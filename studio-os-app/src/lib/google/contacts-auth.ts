import type { Contact } from "@/lib/sheet/app-data";
import {
  createAuthBus,
  createTokenStore,
  requestGisToken,
  type OAuthPending,
} from "./gis-oauth";
import { getStoredCalendarClientId, saveCalendarClientId } from "./calendar-auth";
import { getUnifiedGoogleToken } from "./google-unified-auth";
import { CONTACTS_READONLY_SCOPE } from "./google-scopes";

export { CONTACTS_READONLY_SCOPE };

const STORAGE_TOKEN_KEY = "studio-os.gcontacts-token.v1";
const OPT_OUT_KEY = "studio-os.gcontacts-opt-out.v1";

const store = createTokenStore(STORAGE_TOKEN_KEY);
const bus = createAuthBus();

function contactsPending(): OAuthPending {
  const path =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/settings";
  return {
    storageKey: STORAGE_TOKEN_KEY,
    optOutKey: OPT_OUT_KEY,
    scope: CONTACTS_READONLY_SCOPE,
    returnUrl: path,
  };
}

type PeopleConnection = {
  resourceName?: string;
  names?: { displayName?: string; givenName?: string; familyName?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string }[];
};

type PeopleConnectionsResponse = {
  connections?: PeopleConnection[];
  nextPageToken?: string;
  totalPeople?: number;
};

export function subscribeContactsAuth(cb: () => void) {
  return bus.subscribe(cb);
}

export function isContactsOptOut(): boolean {
  if (getUnifiedGoogleToken()) return false;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OPT_OUT_KEY) === "1";
}

export function getContactsAccessToken(): string | null {
  const unified = getUnifiedGoogleToken();
  if (unified) return unified;
  if (isContactsOptOut()) return null;
  return store.getCached();
}

export function isContactsDirectConnected(): boolean {
  return Boolean(getContactsAccessToken());
}

export function disconnectContactsDirect() {
  store.clear();
  localStorage.setItem(OPT_OUT_KEY, "1");
  bus.emit();
}

export async function connectContactsDirect(clientId?: string): Promise<string> {
  const id = (clientId ?? getStoredCalendarClientId()).trim();
  if (!id) {
    throw new Error("Add a Google Client ID in Settings first.");
  }
  saveCalendarClientId(id);
  localStorage.removeItem(OPT_OUT_KEY);
  const resp = await requestGisToken(
    id,
    CONTACTS_READONLY_SCOPE,
    "consent",
    contactsPending()
  );
  store.write(resp.access_token, resp.expires_in);
  bus.emit();
  return resp.access_token;
}

export async function refreshContactsDirectSilent(): Promise<string | null> {
  if (isContactsOptOut()) return null;
  const id = getStoredCalendarClientId();
  if (!id) return null;
  try {
    const resp = await requestGisToken(id, CONTACTS_READONLY_SCOPE, "");
    store.write(resp.access_token, resp.expires_in);
    bus.emit();
    return resp.access_token;
  } catch {
    return null;
  }
}

function personDisplayName(person: PeopleConnection): string | null {
  const n = person.names?.[0];
  if (n) {
    const display = n.displayName?.trim();
    if (display) return display;
    const parts = [n.givenName?.trim(), n.familyName?.trim()].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return person.emailAddresses?.[0]?.value?.trim() ?? null;
}

function mapPerson(person: PeopleConnection): Contact | null {
  const id = person.resourceName?.trim();
  const name = personDisplayName(person);
  if (!id || !name) return null;
  return {
    id,
    name,
    email: person.emailAddresses?.[0]?.value?.trim() || null,
    phone: person.phoneNumbers?.[0]?.value?.trim() || null,
  };
}

function parsePeopleApiError(status: number, text: string): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string; status?: string } };
    const msg = json.error?.message;
    if (status === 403) {
      return (
        msg ??
        "Contacts access denied — enable People API in Google Cloud, then disconnect and reconnect Google here."
      );
    }
    if (msg) return `Google Contacts (${status}): ${msg}`;
  } catch {
    /* fall through */
  }
  return `Google Contacts (${status}): ${text.slice(0, 200)}`;
}

export async function fetchGoogleContacts(token: string): Promise<Contact[]> {
  const contacts: Contact[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      personFields: "names,emailAddresses,phoneNumbers",
      pageSize: "1000",
      sortOrder: "LAST_NAME_ASCENDING",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(parsePeopleApiError(res.status, text));
    }

    const data = (await res.json()) as PeopleConnectionsResponse;
    for (const person of data.connections ?? []) {
      const mapped = mapPerson(person);
      if (mapped) contacts.push(mapped);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  contacts.sort((a, b) => a.name.localeCompare(b.name));
  return contacts;
}

function splitDisplayName(name: string): { givenName: string; familyName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { givenName: parts[0] ?? name.trim() };
  return { givenName: parts[0]!, familyName: parts.slice(1).join(" ") };
}

/** Fields sent when creating a contact from Studio OS. */
export type CreateContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

/** Create a contact in Google Contacts (requires contacts write scope). */
export async function createGoogleContact(
  token: string,
  input: CreateContactInput
): Promise<Contact> {
  const name = input.name.trim();
  if (!name) throw new Error("Enter a name for the new contact.");

  const { givenName, familyName } = splitDisplayName(name);
  const body: Record<string, unknown> = {
    names: [{ givenName, ...(familyName ? { familyName } : {}) }],
  };
  const email = input.email?.trim();
  if (email) body.emailAddresses = [{ value: email }];
  const phone = input.phone?.trim();
  if (phone) body.phoneNumbers = [{ value: phone }];

  const res = await fetch(
    "https://people.googleapis.com/v1/people:createContact?personFields=names,emailAddresses,phoneNumbers",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error(
        "Google needs permission to add contacts — go to Settings, disconnect Google, then connect again."
      );
    }
    throw new Error(`Could not create contact (${res.status}): ${text.slice(0, 120)}`);
  }

  const person = (await res.json()) as PeopleConnection;
  const mapped = mapPerson(person);
  if (!mapped) throw new Error("Contact created but could not read the response.");
  return mapped;
}

export function parseContactSearchQuery(query: string): { name: string; email?: string | null } {
  const trimmed = query.trim();
  if (!trimmed) return { name: "" };
  if (trimmed.includes("@")) {
    const email = trimmed;
    const local = trimmed.split("@")[0] ?? trimmed;
    const name = local.replace(/[._+-]/g, " ").replace(/\s+/g, " ").trim() || email;
    return { name, email };
  }
  return { name: trimmed };
}

export async function connectAndFetchGoogleContacts(clientId?: string): Promise<Contact[]> {
  let token = getContactsAccessToken();
  if (!token) token = await refreshContactsDirectSilent();
  if (!token) token = await connectContactsDirect(clientId);
  return fetchGoogleContacts(token);
}
