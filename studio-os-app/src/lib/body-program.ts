import { localDateKey, parseLocalDateKey } from "./local-date";

/**
 * Practice — personal daily/stability/mobility routine tracker.
 * Ported from a standalone HTML tool; content and phase timings are
 * deliberately hardcoded (this is one specific program, not a generic
 * habit builder).
 */

export type BodyProgramTrack = "daily" | "stability" | "mobility";
export type BodyProgramSection = BodyProgramTrack | "notes";
export type BodyProgramFeel = "easier" | "same" | "flared";

/** [label, seconds] */
export type BodyProgramPhase = [label: string, seconds: number];

export interface BodyProgramItem {
  id: string;
  meta: string;
  name: string;
  /** Static, developer-authored HTML — safe to render with dangerouslySetInnerHTML. */
  body: string;
  phases?: BodyProgramPhase[];
  /** Doesn't count toward the daily/weekly completion target (e.g. "as needed" items). */
  nocount?: boolean;
}

export interface BodyProgramGroupHeading {
  group: string;
}

export type BodyProgramEntry = BodyProgramItem | BodyProgramGroupHeading;

export function isGroupHeading(entry: BodyProgramEntry): entry is BodyProgramGroupHeading {
  return "group" in entry;
}

export const TRACK_TARGET: Record<BodyProgramTrack, number> = {
  daily: 7,
  stability: 3,
  mobility: 2,
};

export const TRACK_SHORT_LABEL: Record<BodyProgramTrack, string> = {
  daily: "D",
  stability: "S",
  mobility: "M",
};

export const TRACK_LABEL: Record<BodyProgramTrack, string> = {
  daily: "Daily",
  stability: "Stability",
  mobility: "Mobility",
};

export const PRINCIPLE: Record<BodyProgramSection, string> = {
  daily:
    "<strong>Tightness is protective.</strong> Your muscles are gripping to stabilise joints that move too much. Release gently, then give the system something better.",
  stability:
    "<strong>This is the one that changes things.</strong> Guarding stands down when it isn't needed anymore. Small range, high control — not hard.",
  mobility:
    "<strong>Move through range, don't sit in it.</strong> Active and controlled. No hanging, no forcing, no sinking.",
  notes:
    "<strong>Reference.</strong> Pacing, progress markers, export, and when to stop and ask someone.",
};

export const DATA: Record<BodyProgramTrack, BodyProgramEntry[]> = {
  daily: [
    { group: "Session · ~20 min" },
    {
      id: "d1",
      meta: "3 min",
      name: "Nervous system reset",
      phases: [["Breathe · in 4, out 6–8", 180]],
      body: `<p>Extended-exhale breathing. Seated or standing.</p>
      <ul><li>Inhale through the nose — count of 4</li>
      <li>Exhale slowly — count of 6 to 8</li></ul>
      <p>Always first. A guarded system won't let go of anything while it's still on alert.</p>`,
    },
    {
      id: "d2",
      meta: "7 min",
      name: "Scar mobilisation",
      phases: [
        ["Warm-up circles", 60],
        ["Directional", 90],
        ["Cross-friction", 180],
        ["Skin rolling", 90],
      ],
      body: `<ol><li><b>Warm-up circles</b> — on and beside the scar. You should feel the scar <i>move</i>, not just skin gliding over it.</li>
      <li><b>Directional</b> — flat fingers, move tissue back/forth, up/down, small circles.</li>
      <li><b>Cross-friction</b> — firm strokes <i>across</i> the scar line on ropey bits. Fingers grip and move tissue, never slide.</li>
      <li><b>Skin rolling</b> — pinch a fold beside the scar, lift, roll it across.</li></ol>
      <p>Progress: softer, glides more, less pulling. Adhesion work, not joint stretching — which is why it stays in.</p>
      <span class="body-flag"><b>Stop if:</b> sharp pain, blistering, new redness, or bleeding.</span>`,
    },
    {
      id: "d3",
      meta: "2 min",
      name: "Chest release + active follow",
      phases: [
        ["Left · spot 1", 15],
        ["Left · spot 2", 15],
        ["Active movement", 30],
        ["Right · spot 1", 15],
        ["Right · spot 2", 15],
        ["Active movement", 30],
      ],
      body: `<ul><li>Soft ball against the wall, chest to wall — light to moderate pressure only</li>
      <li>Then straight into active movement: slow arm circles, reaching overhead and down</li></ul>
      <p>The active part is the point. Pressure alone just quiets things temporarily — movement is what teaches your nervous system the range is safe.</p>`,
    },
    {
      id: "d4",
      meta: "4 min",
      name: "Abdominal wall release",
      phases: [
        ["Clockwise circles", 120],
        ["Skin rolling", 120],
      ],
      body: `<ul><li>Clockwise around the navel, following the colon — right side up, across, left side down</li>
      <li>Then light skin rolling across the belly</li>
      <li>Long slow exhales the whole time</li></ul>
      <p>Years of trained core engagement turn into a resting grip you stop being able to feel. This is retraining, not just massage.</p>`,
    },
    {
      id: "d5",
      meta: "5 min",
      name: "Lateral-costal breathing",
      phases: [["Ribs wide · exhale on sss", 300]],
      body: `<ul><li>Hands on lower ribs, thumbs toward your back</li>
      <li>Inhale — ribs expand <i>sideways</i> into your hands</li>
      <li>Exhale on "sss", keeping the ribcage from collapsing</li></ul>
      <p>Doubles as vocal warm-up. Same time, two jobs.</p>`,
    },
    {
      id: "d6",
      meta: "3 min",
      name: "Diaphragm + pelvic floor",
      phases: [["Soften down, lift up", 180]],
      body: `<ul><li>On your back, knees bent</li>
      <li>Inhale — belly and ribs expand, pelvic floor softens and lengthens downward</li>
      <li>Exhale — ribs narrow, pelvic floor lifts gently</li></ul>
      <p>Coordination, not stretching. For tension itself, a warm bath does more than a held stretch.</p>`,
    },
    { group: "As needed" },
    {
      id: "d7",
      meta: "Around meals",
      name: "Ribs up, belly gently in",
      nocount: true,
      phases: [
        ["Humming", 120],
        ["Ribs up, belly in", 120],
      ],
      body: `<p>Hum for a couple of minutes before eating when you can.</p>
      <p>After eating: gently lift and expand the lower ribs while drawing the lower belly <i>in</i> — not out.</p>`,
    },
    {
      id: "d8",
      meta: "When it spikes",
      name: "Positional reset",
      nocount: true,
      phases: [["Lie down · slow breath", 300]],
      body: `<p>Lie down on purpose. Slow lateral-costal breathing.</p>
      <p>This is a tool, not avoidance.</p>`,
    },
  ],
  stability: [
    { group: "3× per week · ~15 min" },
    {
      id: "s1",
      meta: "10 reps",
      name: "Wall slides",
      phases: [["10 slow reps", 60]],
      body: `<p>Back to the wall, forearms on the wall. Slide arms up and down keeping contact throughout.</p>
      <p>Slow and controlled. If you lose wall contact, you've gone too far — shorten the range.</p>`,
    },
    {
      id: "s2",
      meta: "10–12 reps",
      name: "Serratus punches",
      phases: [["10–12 reps", 60]],
      body: `<p>On your back, arms straight up toward the ceiling. Push your shoulder blades up off the floor <i>without bending your elbows</i>.</p>
      <p>Small movement. This is the muscle that gives your shoulder blade a base — which is why your pecs stop having to grip.</p>`,
    },
    {
      id: "s3",
      meta: "8–10 reps",
      name: "Prone Y",
      phases: [["8–10 reps · 3 sec holds", 75]],
      body: `<p>Face down, arms out in a Y shape. Lift just a few inches using your mid-back, hold 3 seconds, lower.</p>
      <p>Small range, high control. Height is not the goal.</p>`,
    },
    {
      id: "s4",
      meta: "10 breaths",
      name: "Deep core coordination",
      phases: [["10 breaths", 90]],
      body: `<ul><li>On your back, knees bent</li>
      <li>Exhale slowly — feel a gentle, deep tension low in the abdomen. Barely perceptible.</li>
      <li>Inhale — let it fully release</li></ul>
      <span class="body-flag"><b>Not bracing.</b> If your ribs flare or your outer abs harden, you're gripping — go lighter. Gripping is what you're already doing too much of.</span>`,
    },
    {
      id: "s5",
      meta: "12–15 each",
      name: "Clamshells",
      phases: [
        ["Left side", 60],
        ["Right side", 60],
      ],
      body: `<p>Side-lying, knees bent, feet together. Lift the top knee while keeping the feet touching.</p>
      <p>Slow. Glute med is a main pelvic stabiliser — weak here means something else compensates.</p>`,
    },
    {
      id: "s6",
      meta: "8–10 each",
      name: "Active 90/90 transitions",
      phases: [["8–10 transitions", 90]],
      body: `<p>Sit in 90/90, then <i>actively rotate</i> to the other side using your own muscles.</p>
      <span class="body-flag"><b>No leaning in, no holding.</b> This replaces the 90/90 stretch. The transition is the exercise.</span>`,
    },
    {
      id: "s7",
      meta: "30 sec each",
      name: "Single-leg balance",
      phases: [
        ["Left leg", 30],
        ["Right leg", 30],
      ],
      body: `<p>Stand on one leg. Progress to eyes closed when it's easy.</p>
      <p>Joint position sense is often reduced in hypermobile bodies — this rebuilds it, and it's what lets muscles stop over-gripping as a substitute.</p>`,
    },
  ],
  mobility: [
    { group: "2× per week · ~10 min" },
    {
      id: "m1",
      meta: "8–10 cycles",
      name: "Cat-camel",
      phases: [["8–10 cycles", 90]],
      body: `<p>Hands and knees. Inhale, drop the belly, lift head and tailbone. Exhale, round the spine, tuck chin and tail.</p>
      <p>Slow, with the breath.</p>`,
    },
    {
      id: "m2",
      meta: "8–10 each",
      name: "Open-book rotations",
      phases: [
        ["Left side", 60],
        ["Right side", 60],
      ],
      body: `<p>Side-lying, knees bent, arms extended in front. Rotate the top arm and chest open, following with your eyes. Return.</p>
      <span class="body-flag"><b>Move through the range</b> rather than holding at the end of it.</span>`,
    },
    {
      id: "m3",
      meta: "~2 min",
      name: "Foam roller thoracic extension",
      phases: [
        ["Upper back", 45],
        ["Mid back", 45],
        ["Lower ribs", 45],
      ],
      body: `<p>Roller across the mid-back, hands supporting your head. Extend gently over it, exhaling.</p>
      <span class="body-flag"><b>Don't drape or hang.</b> Supported and controlled — you're mobilising the spine, not loading it into end range.</span>`,
    },
  ],
};

export const NOTES_HTML = `
<div class="body-note"><h3>Pacing</h3>
<p>Hypermobile systems flare when you do too much too fast. Start at about half of what feels doable. Add one new element per week.</p>
<p>A flare 24–48 hours <i>after</i> a session means you went too hard — scale back rather than pushing through. That's what the week strip is for: if flares cluster after your heaviest weeks, you've found your ceiling.</p></div>

<div class="body-note"><h3>What progress actually looks like</h3>
<p>The goal isn't "looser". It's that tightness takes <b>longer to come back</b> after you've been upright. That's guarding standing down.</p>
<ul><li><b>Days 1–7</b> — breathing and warmth give real in-the-moment relief</li>
<li><b>Weeks 2–4</b> — scar softens; stability work feels less shaky</li>
<li><b>Weeks 4–8</b> — tightness returns more slowly after standing</li>
<li><b>Months 2–4</b> — relief holds between sessions; breath shows up in singing</li></ul></div>

<div class="body-note"><h3>Worth testing on the ring</h3>
<p>Lie down 10 min, note resting HR. Stand still 10 min, watch it.</p>
<p>A sustained 30+ bpm rise would point to an orthostatic component worth chasing. Costs nothing, and either opens or closes that door.</p></div>

<div class="body-note"><h3>Finding a physio</h3>
<p>Not a general myofascial release therapist. Someone who works with hypermobility, dancers, or "flexible athletes".</p>
<p><b>Ask:</b> "Do you work with hypermobile clients? Is your approach stability-based or release-based?" If they lead with stretching and deep release, keep looking.</p>
<p>Also worth getting a proper Beighton score — five-minute exam, and it confirms or drops the premise this whole program rests on.</p></div>

<div class="body-note body-note-warn"><h3>See a doctor if</h3>
<p>Bloating comes with weight loss, vomiting, blood in stool, fever, or pain that wakes you at night. That's outside this model and needs a proper workup.</p></div>
`;

// ── Storage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "studio-os.bodyprogram.v1";
const MAX_DAYS_KEPT = 90;

export interface BodyProgramDayRecord {
  checks: Record<string, boolean>;
  feel: BodyProgramFeel | null;
}

export interface BodyProgramState {
  days: Record<string, BodyProgramDayRecord>;
}

export const EMPTY_STATE: BodyProgramState = { days: {} };

export function loadBodyProgramState(): BodyProgramState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw) as Partial<BodyProgramState>;
    return { days: parsed.days && typeof parsed.days === "object" ? parsed.days : {} };
  } catch {
    return { days: {} };
  }
}

export function saveBodyProgramState(state: BodyProgramState): void {
  try {
    const keep = Object.keys(state.days).sort().slice(-MAX_DAYS_KEPT);
    const trimmed: BodyProgramState = {
      days: Object.fromEntries(keep.map((k) => [k, state.days[k]])),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function dayRecord(state: BodyProgramState, dateKey: string): BodyProgramDayRecord {
  return state.days[dateKey] ?? { checks: {}, feel: null };
}

// ── Derived helpers ──────────────────────────────────────────────────────

export function countedItems(track: BodyProgramTrack): BodyProgramItem[] {
  return DATA[track].filter(
    (entry): entry is BodyProgramItem => !isGroupHeading(entry) && !entry.nocount
  );
}

export function itemById(id: string): BodyProgramItem | null {
  for (const track of Object.keys(DATA) as BodyProgramTrack[]) {
    const found = DATA[track].find((entry) => !isGroupHeading(entry) && entry.id === id);
    if (found) return found as BodyProgramItem;
  }
  return null;
}

export function trackDoneOnDate(
  state: BodyProgramState,
  track: BodyProgramTrack,
  dateKey: string
): boolean {
  const rec = state.days[dateKey];
  if (!rec) return false;
  return countedItems(track).every((item) => rec.checks[item.id]);
}

/** 7 local date keys, Monday through Sunday, for the week `offset` weeks from this one. */
export function weekDateKeys(offset: number, now = new Date()): string[] {
  const anchor = new Date(now);
  anchor.setHours(12, 0, 0, 0);
  anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return localDateKey(d);
  });
}

export function weekLabel(offset: number, dates: string[]): string {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  return parseLocalDateKey(dates[0]).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** M:SS */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}
