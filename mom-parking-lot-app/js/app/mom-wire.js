/**
 * Mom app wiring: Today/Focus renderers, notes, archive — no week planning.
 */
import { createTodaySimpleRenderer } from '../render/today-simple.js';
import { createFocusSplitRenderer } from '../render/focus-split.js';
import { createNotesUI } from '../features/notes-ui.js';
import { createArchiveCalendar } from '../features/archive-calendar.js';

const noopWeekPlanning = {
  openPlanningEntry: () => {},
  renderWeekStrip: () => {},
  forceCloseAllPlanningUI: () => {},
  refreshOpenPlanner: () => {},
  askTopOrBottom: (_cb) => {}
};

/**
 * @param {object} ctx
 * @param {import('../state.js').state} ctx.state
 * @param {() => void} ctx.saveState
 * @param {(id: string) => void} ctx.markDone
 * @param {() => void} ctx.renderColumns
 * @param {(msg: string) => void} ctx.showToast
 * @param {() => void} [ctx.updateTally]
 * @param {object} ctx.todayUiRef
 */
export function wireMomTodayAndFocus(ctx) {
  const todaySimple = createTodaySimpleRenderer({
    state: ctx.state,
    saveState: ctx.saveState,
    markDone: ctx.markDone,
    renderColumns: ctx.renderColumns
  });

  const focusSplit = createFocusSplitRenderer({
    state: ctx.state,
    saveState: ctx.saveState,
    markDone: ctx.markDone,
    updateTally: ctx.updateTally
  });

  const notesApi = createNotesUI({
    state: ctx.state,
    saveState: ctx.saveState,
    showToast: ctx.showToast,
    renderColumns: ctx.renderColumns
  });

  const archiveApi = createArchiveCalendar({
    state: ctx.state,
    showToast: ctx.showToast
  });

  ctx.todayUiRef.refresh = () => {
    todaySimple.renderTodayList();
    focusSplit.renderFocus();
  };
  ctx.todayUiRef.removeFromToday = (id) => todaySimple.removeFromToday(id);

  return {
    renderTodayList: () => todaySimple.renderTodayList(),
    renderFocusList: () => focusSplit.renderFocus(),
    removeFromToday: (id) => todaySimple.removeFromToday(id),
    weekPlanningApi: noopWeekPlanning,
    renderWeekStrip: () => {},
    notesApi,
    archiveApi
  };
}
