/**
 * Single place for Supabase realtime subscriptions (via window.talkAbout).
 * Avoid duplicate subscribe calls across features — teardown before re-subscribe.
 */

/**
 * @param {object} ctx
 * @param {import('../state.js').state} ctx.state
 * @param {object} [ctx.talkAbout] window.talkAbout
 * @param {(prefs: object) => void} ctx.applyDevicePreferencesToState
 * @param {() => void} ctx.refreshUIAfterRemotePrefs
 */
export function attachDevicePreferencesRealtime(ctx) {
  const { state, talkAbout, applyDevicePreferencesToState, refreshUIAfterRemotePrefs } = ctx;
  if (!talkAbout || !state.deviceSyncId) {
    if (state.prefsUnsubscribe) {
      state.prefsUnsubscribe();
      state.prefsUnsubscribe = null;
    }
    return;
  }
  if (state.prefsUnsubscribe) state.prefsUnsubscribe();
  state.prefsUnsubscribe = talkAbout.subscribeDevicePreferences(state.deviceSyncId, (prefs) => {
    applyDevicePreferencesToState(prefs);
    refreshUIAfterRemotePrefs();
  });
}

/**
 * @param {object} ctx
 * @param {import('../state.js').state} ctx.state
 * @param {object} [ctx.talkAbout]
 * @param {() => void} ctx.renderTalkAbout
 */
export function attachTalkAboutRealtime(ctx) {
  const { state, talkAbout, renderTalkAbout } = ctx;
  if (talkAbout && state.pairId) {
    if (state.talkAboutUnsubscribe) state.talkAboutUnsubscribe();
    state.talkAboutUnsubscribe = talkAbout.subscribeTalkAbout(state.pairId, (items) => {
      state.talkAboutItems = items;
      renderTalkAbout();
    });
  } else if (state.talkAboutUnsubscribe) {
    state.talkAboutUnsubscribe();
    state.talkAboutUnsubscribe = null;
  }
}

/**
 * @param {object} ctx
 * @param {import('../state.js').state} ctx.state
 * @param {object} [ctx.talkAbout]
 * @param {(show?: boolean) => void} ctx.renderEmailTriage
 */
export function attachEmailTriageRealtime(ctx) {
  const { state, talkAbout, renderEmailTriage } = ctx;
  if (!talkAbout) return;
  const triagePairId = state.pairId || 'solo_default';
  const triageAddedBy = state.addedBy;
  talkAbout.getLastAgentRun(triagePairId, triageAddedBy).then(run => {
    state.lastAgentRun = run;
    renderEmailTriage(false);
  });
  if (state.emailTriageUnsubscribe) state.emailTriageUnsubscribe();
  state.emailTriageUnsubscribe = talkAbout.subscribeEmailTasks(triagePairId, triageAddedBy, items => {
    state.emailTriageItems = items;
    renderEmailTriage(false);
  });
}

/**
 * Full main-app subscription set (after showMainApp). Skip when __E2E__.
 * @param {object} ctx
 * @param {import('../state.js').state} ctx.state
 * @param {Window & { talkAbout?: object; __E2E__?: boolean }} ctx.win
 * @param {(prefs: object) => void} ctx.applyDevicePreferencesToState
 * @param {() => void} ctx.refreshUIAfterRemotePrefs
 * @param {() => void} ctx.renderTalkAbout
 * @param {(show?: boolean) => void} ctx.renderEmailTriage
 */
export function attachMainAppRealtime(ctx) {
  const { state, win, applyDevicePreferencesToState, refreshUIAfterRemotePrefs, renderTalkAbout, renderEmailTriage } = ctx;
  const talkAbout = win.talkAbout;
  if (typeof win !== 'undefined' && win.__E2E__) return;

  attachTalkAboutRealtime({ state, talkAbout, renderTalkAbout });
  attachDevicePreferencesRealtime({ state, talkAbout, applyDevicePreferencesToState, refreshUIAfterRemotePrefs });

  if (talkAbout) {
    attachEmailTriageRealtime({ state, talkAbout, renderEmailTriage });
  }
}
