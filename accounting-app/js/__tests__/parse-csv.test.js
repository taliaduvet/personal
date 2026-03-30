import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(__dirname, '../parse-csv.js'), 'utf8');

function loadParseCsv() {
  const ctx = { window: {} };
  ctx.window = ctx.window;
  ctx.globalThis = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window.LedgerParseCsv.parseCsv;
}

describe('parse-csv (RFC 4180-style)', () => {
  const parseCsv = loadParseCsv();

  it('parses simple rows', () => {
    const { headers, rows } = parseCsv('Date,Amount\n2024-01-01,10.00\n');
    expect(headers).toEqual(['Date', 'Amount']);
    expect(rows).toEqual([{ Date: '2024-01-01', Amount: '10.00' }]);
  });

  it('handles commas inside quoted fields', () => {
    const { headers, rows } = parseCsv('Date,Description,Amount\n2024-01-01,"Pay, LLC",-9.99\n');
    expect(headers).toEqual(['Date', 'Description', 'Amount']);
    expect(rows[0]).toEqual({
      Date: '2024-01-01',
      Description: 'Pay, LLC',
      Amount: '-9.99',
    });
  });

  it('handles escaped quotes in quoted field', () => {
    const { rows } = parseCsv('A,B\n1,"say ""hi""",2\n');
    expect(rows[0].B).toBe('say "hi"');
  });

  it('handles CRLF and blank line skip', () => {
    const { rows } = parseCsv('X,Y\r\na,b\r\n\r\nc,d\r\n');
    expect(rows).toEqual([{ X: 'a', Y: 'b' }, { X: 'c', Y: 'd' }]);
  });

  it('returns empty for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
    expect(parseCsv('   ')).toEqual({ headers: [], rows: [] });
  });
});
