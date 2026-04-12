import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('app.js / ledger-pure single source', () => {
  it('does not redefine normalizeDate (imported from ledger-pure.js)', () => {
    const appSrc = readFileSync(join(__dirname, '../../app.js'), 'utf8');
    expect(appSrc).not.toMatch(/function normalizeDate\s*\(/);
  });
});
