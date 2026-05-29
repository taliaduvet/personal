import { state } from '../state.js';
import { createItem, detectPileFromText } from './tasks.js';
import { createNote } from './notes.js';
import { ensureInboxPile, INBOX_PILE_ID } from './piles-people.js';

/**
 * Process one brain-dump line. Mutates state; caller must saveState().
 * @returns {'note'|'task'|null}
 */
export function processBrainDumpLine(line) {
  const trimmed = (line || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('#')) {
    const text = trimmed.slice(1).trim();
    if (!text) return null;
    createNote(text, null, 'quick-capture');
    return 'note';
  }

  ensureInboxPile();
  let priority = 'medium';
  let taskText = trimmed;
  if (trimmed.startsWith('!')) {
    priority = 'critical';
    taskText = trimmed.slice(1).trim();
  }
  if (!taskText) return null;

  const detectedPile = detectPileFromText(taskText);
  const pileId = detectedPile ? detectedPile.id : INBOX_PILE_ID;

  const item = createItem(
    taskText,
    state.lastCategory,
    null,
    priority,
    null,
    null,
    null,
    pileId,
    null,
    null
  );
  state.items.push(item);
  return 'task';
}
