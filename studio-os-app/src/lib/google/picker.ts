import { driveFolderUrl } from "../drive-folder";
import type { DriveDocLink, DriveFolderLink } from "../types";
import {
  ensureGapiPicker,
  GOOGLE_API_KEY,
  hasGooglePickerEnv,
} from "./load-script";

export { hasGooglePickerEnv, GOOGLE_API_KEY };

/** Open Google Picker in folder-only mode. User chooses any folder in their Drive. */
export async function pickDriveFolder(accessToken: string): Promise<DriveFolderLink | null> {
  if (!accessToken) throw new Error("Sign in with Google to pick a folder.");
  if (!hasGooglePickerEnv()) throw new Error("Google Picker is not configured.");

  await ensureGapiPicker();

  const google = window.google;
  if (!google?.picker) throw new Error("Google Picker failed to load.");

  return new Promise((resolve) => {
    const folderView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true)
      .setMimeTypes("application/vnd.google-apps.folder");

    const picker = new google.picker.PickerBuilder()
      .addView(folderView)
      .setOAuthToken(accessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setTitle("Choose a folder for this project")
      .setCallback((data) => {
        if (data.action !== google.picker.Action.PICKED || !data.docs?.length) {
          resolve(null);
          return;
        }
        const doc = data.docs[0];
        resolve({
          id: doc.id,
          name: doc.name || "Drive folder",
          url: doc.url || driveFolderUrl(doc.id),
          linkedAt: Date.now(),
        });
      })
      .build();

    picker.setVisible(true);
  });
}

/** Open Google Picker for Google Docs (and similar file types). */
export async function pickDriveDoc(accessToken: string): Promise<DriveDocLink | null> {
  if (!accessToken) throw new Error("Sign in with Google to pick a document.");
  if (!hasGooglePickerEnv()) throw new Error("Google Picker is not configured.");

  await ensureGapiPicker();

  const google = window.google;
  if (!google?.picker) throw new Error("Google Picker failed to load.");

  return new Promise((resolve) => {
    const docView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setMimeTypes(
        "application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,application/vnd.google-apps.presentation"
      );

    const picker = new google.picker.PickerBuilder()
      .addView(docView)
      .setOAuthToken(accessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setTitle("Choose a document for this project")
      .setCallback((data) => {
        if (data.action !== google.picker.Action.PICKED || !data.docs?.length) {
          resolve(null);
          return;
        }
        const doc = data.docs[0];
        resolve({
          id: doc.id,
          name: doc.name || "Google Doc",
          url: doc.url || `https://docs.google.com/document/d/${doc.id}/edit`,
          linkedAt: Date.now(),
        });
      })
      .build();

    picker.setVisible(true);
  });
}
