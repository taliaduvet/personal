import { driveFolderUrl } from "../drive-folder";
import type { DriveFolderLink } from "../types";
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
