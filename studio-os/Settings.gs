/**
 * Studio OS — hidden _Settings tab (key / value).
 *
 * A flat key/value store the Phase 2 app reads and writes predictably via the
 * Sheets API. Far simpler for code than scattered named ranges.
 *
 * Layout: row 1 = header (Key | Value), data from row 2.
 */

/** Build/repair the _Settings tab, preserving any values the user has set. */
function buildSettings_(ss) {
  const sh = getOrCreateSheet_(ss, TAB.SETTINGS);

  // Preserve existing values across a rebuild.
  const existing = readAllSettings_(ss);

  // First build only: localize the spreadsheet timezone to the script's
  // configured timezone (fixes the clasp-default America/New_York). Never
  // override on later rebuilds, so a user's own File > Settings choice sticks.
  if (!existing.timezone) {
    try { ss.setSpreadsheetTimeZone(Session.getScriptTimeZone()); } catch (e) { /* non-fatal */ }
  }

  resetSheet_(sh);
  applyBaseSheetStyle_(sh);

  sh.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  styleHeaderRow_(sh, sh.getRange(1, 1, 1, 2), 30);
  sh.getRange(1, 1, 1, 2).setValues([upper_(['Key', 'Value'])]);

  const rows = SETTINGS_DEFAULTS.map(function (pair) {
    const key = pair[0];
    let val = (existing.hasOwnProperty(key) && existing[key] !== '') ? existing[key] : pair[1];

    // Always (re)derive these from the live spreadsheet.
    if (key === 'timezone') val = ss.getSpreadsheetTimeZone();
    if (key === 'sheetId') val = ss.getId();
    if (key === 'schemaVersion') val = SCHEMA_VERSION;

    return [key, val];
  });

  sh.getRange(2, 1, rows.length, 2).setValues(rows);

  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(2, 320);
  sh.setFrozenRows(1);
}

/** Read all settings into a plain object {key: value}. */
function readAllSettings_(ss) {
  ss = ss || SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(TAB.SETTINGS);
  const out = {};
  if (!sh) return out;
  const last = sh.getLastRow();
  if (last < 2) return out;
  const values = sh.getRange(2, 1, last - 1, 2).getValues();
  values.forEach(function (r) {
    const key = String(r[0]).trim();
    if (key) out[key] = r[1];
  });
  return out;
}

/** Read a single setting, with an optional fallback. */
function getSetting_(key, fallback) {
  const all = readAllSettings_();
  return all.hasOwnProperty(key) && all[key] !== '' ? all[key] : (fallback === undefined ? '' : fallback);
}

/** Write a single setting (creates the row if the key is new). */
function setSetting_(key, value) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(TAB.SETTINGS);
  if (!sh) return;
  const last = sh.getLastRow();
  if (last >= 2) {
    const keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]).trim() === key) {
        sh.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }
  sh.appendRow([key, value]);
}
