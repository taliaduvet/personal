import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { INCOME_TYPES } from '../ledger-constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractIncomeTypeConstraint(sql) {
  const match = sql.match(/income_type\s+text\s+check\s*\(\s*income_type\s+in\s*\(([^)]+)\)/i);
  if (!match) return null;
  return match[1].split(',').map(s => s.trim().replace(/'/g, ''));
}

describe('income_type schema lockstep', () => {
  it('INCOME_TYPES in ledger-constants.js matches supabase schema constraint', () => {
    const sql = readFileSync(join(__dirname, '../../supabase-accounting-schema.sql'), 'utf8');
    const schemaTypes = extractIncomeTypeConstraint(sql);
    expect(schemaTypes).not.toBeNull();
    const appTypes = INCOME_TYPES.map(t => t.id).sort();
    const dbTypes = schemaTypes.sort();
    expect(appTypes).toEqual(dbTypes);
  });
});
