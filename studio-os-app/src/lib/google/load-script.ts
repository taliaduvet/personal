/** Load a script tag once; resolves when the script is ready. */
export function loadScript(src: string, id?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    if (id) el.id = id;
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

let gapiReady: Promise<void> | null = null;

export function ensureGapiPicker(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Picker requires a browser"));
  if (!gapiReady) {
    gapiReady = loadScript("https://apis.google.com/js/api.js", "google-api-js").then(() =>
      new Promise((resolve, reject) => {
        if (!window.gapi?.load) {
          reject(new Error("Google API not available"));
          return;
        }
        window.gapi.load("picker", {
          callback: () => resolve(),
          onerror: () => reject(new Error("Failed to load Google Picker")),
        });
      })
    );
  }
  return gapiReady;
}

declare global {
  interface Window {
    gapi?: {
      load: (
        name: string,
        opts: { callback?: () => void; onerror?: () => void }
      ) => void;
    };
    google?: {
      picker: {
        ViewId: { FOLDERS: string; DOCS: string };
        Feature: { NAV_HIDDEN: boolean; MULTISELECT_ENABLED: boolean };
        Action: { PICKED: string; CANCEL: string };
        DocsView: new (viewId: string) => {
          setSelectFolderEnabled: (enabled: boolean) => GooglePickerView;
          setIncludeFolders: (include: boolean) => GooglePickerView;
          setMimeTypes: (mime: string) => GooglePickerView;
        };
        PickerBuilder: new () => GooglePickerBuilder;
      };
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            ux_mode?: "popup" | "redirect";
            redirect_uri?: string;
            callback: (resp: {
              error?: string;
              error_description?: string;
              access_token?: string;
              expires_in?: number;
            }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

type GooglePickerView = {
  setSelectFolderEnabled: (enabled: boolean) => GooglePickerView;
  setIncludeFolders: (include: boolean) => GooglePickerView;
  setMimeTypes: (mime: string) => GooglePickerView;
};

type GooglePickerBuilder = {
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setCallback: (cb: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

type GooglePickerDoc = {
  id: string;
  name: string;
  url?: string;
  parentId?: string;
  mimeType?: string;
};

type GooglePickerResponse = {
  action: string;
  docs?: GooglePickerDoc[];
};

export const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

export function hasGooglePickerEnv(): boolean {
  return Boolean(GOOGLE_API_KEY);
}
