/**
 * Studio OS — Calendar sync (Apps Script engine).
 *
 * Events live on a dedicated "Studio OS" calendar (auto-created) so task events
 * stay isolated from the user's personal calendar.
 *
 * Column L (Tasks) stores event IDs in the format:
 *
 *     deadline:EVENT_ID|doing:EVENT_ID
 *
 * Either part may be absent. This is idempotent — running sync twice never
 * duplicates events because each row reuses (and updates in place) the IDs
 * already stored in column L.
 *
 * PHASE 2: the React app takes over this column via the Google Calendar API,
 * keeping the exact same format. See Config.gs (EVENT_TAG) for the contract.
 */
function calendarSync() {
  const ss = SpreadsheetApp.getActive();

  // Ownership guard: this Apps Script engine only syncs while it is the
  // designated owner ('appsScript'). When the Phase 2 app takes over
  // ('app') or sync is disabled ('off'), this bails so the two never fight
  // over the same calendar events. See Config.gs (calendarSyncMode contract).
  const mode = getSetting_('calendarSyncMode', 'appsScript');
  if (mode !== 'appsScript') {
    toast_('Calendar sync skipped — owner is "' + mode + '" (see _Settings → calendarSyncMode).');
    return;
  }

  const cal = getOrCreateStudioCalendar_();
  const sh = ss.getSheetByName(TAB.TASKS);
  const last = sh.getLastRow();

  if (last >= TASKS.FIRST_DATA_ROW) {
    const n = last - TASKS.FIRST_DATA_ROW + 1;
    const data = sh.getRange(TASKS.FIRST_DATA_ROW, 1, n, TASKS.HEADERS.length).getValues();

    for (var i = 0; i < data.length; i++) {
      const name = String(data[i][TASKS.COL.TASK - 1]).trim();
      if (!name) continue;

      const deadline = data[i][TASKS.COL.DEADLINE - 1];
      const doing = String(data[i][TASKS.COL.DOING_DAY - 1]).trim();
      const status = String(data[i][TASKS.COL.STATUS - 1]).trim();
      const ids = parseEventIds_(data[i][TASKS.COL.EVENT_ID - 1]);

      if (status === 'Done') {
        deleteEvent_(cal, ids.deadline);
        deleteEvent_(cal, ids.doing);
        data[i][TASKS.COL.EVENT_ID - 1] = '';
        continue;
      }

      // Hard Deadline -> all-day event
      if (deadline instanceof Date) {
        ids.deadline = ensureAllDayEvent_(cal, ids.deadline, name, deadline);
      } else if (ids.deadline) {
        deleteEvent_(cal, ids.deadline);
        ids.deadline = null;
      }

      // Doing Day -> 1-hour 9am block on the next occurrence of that weekday
      if (doing) {
        ids.doing = ensureDoingEvent_(cal, ids.doing, name, doing);
      } else if (ids.doing) {
        deleteEvent_(cal, ids.doing);
        ids.doing = null;
      }

      data[i][TASKS.COL.EVENT_ID - 1] = buildEventIds_(ids);
    }

    // Write column L back in one shot.
    const out = data.map(function (r) { return [r[TASKS.COL.EVENT_ID - 1]]; });
    sh.getRange(TASKS.FIRST_DATA_ROW, TASKS.COL.EVENT_ID, out.length, 1).setValues(out);
  }

  ensureWeeklyReviewSeries_(cal);
  setSetting_('calendarId', cal.getId());

  SpreadsheetApp.flush();
  toast_('Calendar synced to "' + cal.getName() + '".');
}

/* ---------------- Calendar + event helpers ---------------- */

/** Find or create the dedicated Studio OS calendar. */
function getOrCreateStudioCalendar_() {
  const id = getSetting_('calendarId');
  if (id) {
    try {
      const c = CalendarApp.getCalendarById(id);
      if (c) return c;
    } catch (e) { /* fall through and recreate */ }
  }
  const name = getSetting_('calendarName', 'Studio OS');
  const found = CalendarApp.getCalendarsByName(name);
  let cal;
  if (found && found.length) {
    cal = found[0];
  } else {
    cal = CalendarApp.createCalendar(name, {
      timeZone: tz_(),
      summary: 'Tasks & deadlines from Studio OS',
      color: CalendarApp.Color.INDIGO,
    });
  }
  setSetting_('calendarId', cal.getId());
  return cal;
}

/** Create-or-update an all-day event; returns its id. */
function ensureAllDayEvent_(cal, id, title, date) {
  if (id) {
    const ev = getEventById_(cal, id);
    if (ev) {
      ev.setTitle(title);
      ev.setAllDayDate(date);
      return id;
    }
  }
  return cal.createAllDayEvent(title, date).getId();
}

/** Create-or-update a 1-hour 9am event on the next occurrence of `dayName`. */
function ensureDoingEvent_(cal, id, title, dayName) {
  const start = nextWeekdayAt_(dayName, 9, 0);
  if (!start) return id || null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  if (id) {
    const ev = getEventById_(cal, id);
    if (ev) {
      ev.setTitle(title);
      ev.setTime(start, end);
      return id;
    }
  }
  return cal.createEvent(title, start, end).getId();
}

/** Recurring Weekly Review block — created once, reused thereafter. */
function ensureWeeklyReviewSeries_(cal) {
  const existing = getSetting_('weeklyReviewEventId');
  if (existing) {
    try {
      const s = cal.getEventSeriesById(existing);
      if (s) return;
    } catch (e) { /* recreate below */ }
  }
  const dayName = getSetting_('weeklyReviewDay', 'Mon');
  const time = String(getSetting_('weeklyReviewTime', '09:00'));
  const hh = parseInt(time.split(':')[0], 10) || 9;
  const mm = parseInt(time.split(':')[1], 10) || 0;

  const start = nextWeekdayAt_(dayName, hh, mm);
  if (!start) return;
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const recurrence = CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(weekdayEnum_(dayName));
  const series = cal.createEventSeries('Weekly Review — Studio OS', start, end, recurrence);
  setSetting_('weeklyReviewEventId', series.getId());
}

/** Safe getEventById — returns null if the event was deleted externally. */
function getEventById_(cal, id) {
  try {
    return cal.getEventById(id);
  } catch (e) {
    return null;
  }
}

/** Safe delete — ignores already-missing events. */
function deleteEvent_(cal, id) {
  if (!id) return;
  const ev = getEventById_(cal, id);
  if (ev) {
    try { ev.deleteEvent(); } catch (e) { /* already gone */ }
  }
}

/* ---------------- ID-format helpers (the Phase 2 contract) ---------------- */

/** Parse "deadline:ID|doing:ID" -> {deadline, doing}. */
function parseEventIds_(str) {
  const res = { deadline: null, doing: null };
  if (!str) return res;
  String(str).split('|').forEach(function (part) {
    const idx = part.indexOf(':');
    if (idx <= 0) return;
    const tag = part.slice(0, idx);
    const id = part.slice(idx + 1);
    if (tag === EVENT_TAG.DEADLINE) res.deadline = id;
    else if (tag === EVENT_TAG.DOING) res.doing = id;
  });
  return res;
}

/** Build "deadline:ID|doing:ID" from {deadline, doing}. */
function buildEventIds_(ids) {
  const parts = [];
  if (ids.deadline) parts.push(EVENT_TAG.DEADLINE + ':' + ids.deadline);
  if (ids.doing) parts.push(EVENT_TAG.DOING + ':' + ids.doing);
  return parts.join('|');
}

/* ---------------- Date helpers ---------------- */

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Next date (>= today) whose weekday matches dayName, at hh:mm local. */
function nextWeekdayAt_(dayName, hh, mm) {
  const target = WEEKDAY_INDEX[dayName];
  if (target === undefined) return null;
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, hh, mm, 0);
}

/** Map a day name to a CalendarApp.Weekday enum. */
function weekdayEnum_(dayName) {
  const map = {
    Sun: CalendarApp.Weekday.SUNDAY,
    Mon: CalendarApp.Weekday.MONDAY,
    Tue: CalendarApp.Weekday.TUESDAY,
    Wed: CalendarApp.Weekday.WEDNESDAY,
    Thu: CalendarApp.Weekday.THURSDAY,
    Fri: CalendarApp.Weekday.FRIDAY,
    Sat: CalendarApp.Weekday.SATURDAY,
  };
  return map[dayName] || CalendarApp.Weekday.MONDAY;
}
