/**
 * RFC 4180–style CSV parser (quoted fields, commas, escaped quotes).
 * Exposes window.LedgerParseCsv.parseCsv for the app; Vitest loads via vm.
 */
(function (global) {
  'use strict';

  function parseCsv(text) {
    if (text == null || String(text).trim() === '') return { headers: [], rows: [] };
    const str = String(text).replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let i = 0;
    let inQuotes = false;

    function pushField() {
      row.push(field);
      field = '';
    }
    function pushRow() {
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row);
      }
      row = [];
    }

    while (i < str.length) {
      const c = str[i];
      if (inQuotes) {
        if (c === '"') {
          if (str[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ',') {
        pushField();
        i++;
        continue;
      }
      if (c === '\r') {
        if (str[i + 1] === '\n') i++;
        pushField();
        pushRow();
        i++;
        continue;
      }
      if (c === '\n') {
        pushField();
        pushRow();
        i++;
        continue;
      }
      field += c;
      i++;
    }
    pushField();
    if (row.length && !(row.length === 1 && row[0] === '')) {
      rows.push(row);
    }

    if (!rows.length) return { headers: [], rows: [] };
    const headers = rows[0].map(function (h) {
      return String(h).trim();
    });
    const objects = [];
    for (let r = 1; r < rows.length; r++) {
      const line = rows[r];
      if (line.every(function (c) {
        return String(c).trim() === '';
      })) {
        continue;
      }
      const obj = {};
      headers.forEach(function (h, idx) {
        obj[h] = (line[idx] != null ? String(line[idx]) : '').trim();
      });
      objects.push(obj);
    }
    return { headers: headers, rows: objects };
  }

  global.LedgerParseCsv = { parseCsv: parseCsv };
})(typeof window !== 'undefined' ? window : globalThis);
