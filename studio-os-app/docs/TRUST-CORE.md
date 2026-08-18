# Studio OS — The Trust Core

*Design document. Status: **draft for review** — nothing here is built yet.*
*Last updated: July 26, 2026*

> Read this before building anything in Layer 7+. It supersedes the ad-hoc nudge
> notes in `studio-os-followup-system-brief.md`, several of which are now known
> to be wrong (see §3).

---

## 1. The promise

> **Nothing you've captured will silently fall through. What needs you will come
> to you. And when the system can't keep that promise, it says so — instead of
> looking fine.**

That is the entire product. Everything below serves it.

Studio OS is not a task app with reminders bolted on. It is an **external brain
built to be trusted** — so the constant background question *"am I forgetting
something? am I letting someone down?"* can be handed off and stopped.

This has a hard consequence: **a half-trusted system is worse than none.** If you
have to keep a backup copy in your head, the app has failed even when every
feature works. So the design optimises for *trustworthiness*, not capability, and
prefers saying nothing to saying something it hasn't earned.

### Who this is for

Primary user is autistic, works as a musician across many parallel commitments
(releases, grants, touring, a day job, other artists), and needs the system to
hold what working memory won't. The design generalises — most people drowning in
commitments need this — but every trade-off is decided in favour of the primary
user.

---

## 2. Why conventional task apps fail here

They assume a user who:

1. **Opens the app.** Most tools are passive: they wait to be checked. Anything
   that must be *remembered to be checked* cannot be the thing you trust.
2. **Converts hours into output at a stable rate.** Scheduling tools budget time.
   Attention here is bursty — sometimes eight hours of work happens in two,
   sometimes a day produces nothing. Time-budgeting produces confidently wrong
   plans in both directions.
3. **Starts a task once it is on a list.** Getting a task written down is not the
   hard part. *Initiating* it is, and a list does nothing for initiation.
4. **Responds well to pressure.** Escalating urgency is the standard nudge
   design, and for this user it is actively counter-productive (§3.3).

Studio OS already avoids (1) — push works, verified end-to-end. This document is
mostly about (2), (3) and (4).

---

## 3. Research basis

Each finding below has a design consequence. Where a finding **contradicts an
earlier Studio OS design decision**, that is called out explicitly.

### 3.1 Monotropism — attention is the scarce resource

Autistic attention concentrates into a few deep channels; attention is finite, so
depth in one channel means little is available elsewhere. Pulling out of a
channel collapses the state, and rebuilding it costs real time and energy.
Forcing multiple simultaneous streams produces "monotropic split" — anxiety,
overwhelm, exhaustion.

- [Monotropism and Wellbeing](https://monotropism.org/wellbeing/)
- [Reframing Autism — Monotropism](https://reframingautism.org.au/monotropism-understanding-autistic-ways-of-being-through-the-lens-of-attention/)

**Consequences**

- **Notifications are not free.** Every interruption has a cost that must be
  modelled, not assumed to be zero. ⚠️ *Contradicts the earlier nudge-heavy
  design.*
- **Never interrupt an active attention channel.** A session in progress is
  protected.
- **Batch by channel.** Group work so fewer, deeper switches replace many shallow
  ones. Minimise *switch count*, not idle time.
- ✅ **Work-mode days were already right.** Stamping a day with one mode is a
  monotropism-aligned design. It should become load-bearing, not decorative.

### 3.2 Autistic inertia — starting *and* stopping

Inertia is difficulty starting, stopping, or switching, involuntary and
explicitly **not** procrastination. It presents as "stuck at rest" *or* "stuck in
motion." Initiation is hardest when a task is **vague, multi-step, socially
loaded, or sensory-demanding**. One qualitative study is titled *"No Way Out
Except From External Intervention."*

- [First-Hand Accounts of Autistic Inertia](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8314008/)
- [Inertial rest and motion (qualitative)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11067417/)
- [Start / stop / switch](https://lifeskillsadvocate.com/blog/autistic-inertia-start-stop-switch/)

**Consequences**

- **Stopping is half the problem and was entirely missing from earlier designs.**
  The 72-hour logged session is "stuck in motion", not user error. Auto-close and
  transition support are *care* features, not just data hygiene.
- **The four blockers are a build spec.** For any task the system wants started,
  it should reduce: vagueness (name a concrete next physical action),
  multi-step-ness (decompose), social load (draft the message), sensory demand
  (surface it so it can be planned around).
- **Repeated deferral means inertia, not laziness.** Correct response is to
  *lower activation energy*, never to nag harder.
- External intervention is what breaks inertia — this is the justification for
  the app existing at all.

**How to end something (research).** Transition warnings — advance notice and
visual countdowns — act as gentle prompts that allow *mental preparation*, and
seeing time pass reduces anxiety and builds trust in the routine. Adults
specifically require "precision, honesty, and consistency" in stated times.

- [Using time warnings](https://leafwingcenter.org/using-time-warnings-to-help-students-with-autism/)
- [Transition strategies for adults](https://lifeskillsadvocate.com/blog/autism-transition-strategies-for-adults/)
- [Transition time (Indiana Resource Center for Autism)](https://iidc.indiana.edu/irca/articles/transition-time-helping-individuals-on-the-autism-spectrum-move-successfully-from-one-activity-to-another.html)

**Consequences:** a stop is *announced, then counted down* — never abrupt. A
runaway session gets a soft check-in ("you've been at this 3h — keep going?")
rather than a hard cut. Any time the system states must be **accurate**, because
a fudged timer destroys the trust the countdown is meant to build.

### 3.3 Demand avoidance — pressure backfires

For a demand-avoidant profile, ordinary expectations can register as threats to
autonomy. Repeating reminders, increasing urgency, or creating a compliance
dynamic escalates avoidance. Rewards, streaks and gamification fail for the same
reason — the demand is still a demand. What helps: curious, non-demanding
framing, and offering genuine choice.

- [Reframing Autism — PDA guide](https://reframingautism.org.au/pathological-demand-avoidance-pda-and-autism-guide-for-allies/)
- [Support that doesn't become a power struggle](https://www.scienceworkshealth.com/post/pda-profile-meaning-signs-and-support-that-doesn-t-turn-into-a-power-struggle)

**Consequences**

- ⚠️ **Contradicts the earlier escalating-urgency design.** The system must
  **never get louder.** If something is ignored, it repeats *differently* or
  reduces the demand — it does not raise the pressure.
- **No streaks, badges, scores, or completion rewards. Ever.**
- Language is informational and choice-offering, never imperative (§7).

### 3.4 Implementation intentions — cue beats clock

"If X, then Y" plans tie an action to a concrete situation, which "disencumbers
executive functions" so initiation no longer requires conscious intent. Robust
evidence in ADHD/executive-function populations.

- [Implementation Intentions Facilitate Response Inhibition (Springer)](https://link.springer.com/article/10.1007/s10608-007-9150-1)
- [APSARD — implementation plans](https://apsard.org/managing-adhd-what-is-your-implementation-plan/)

**Consequences**

- **Anchor to cues, not times.** "After the dentist appointment" beats "2pm."
  Calendar events, session ends, and daily routines are real anchors.
- Cue-anchoring is **robust to non-linear output** — it never predicts how much
  will get done, it only notices that a cue occurred.
- It also removes the in-the-moment decision, which is the actual bottleneck.

### 3.5 Probabilistic forecasting — ranges, not dates

Monte Carlo forecasting samples **historical throughput** many times to produce a
delivery date *range with confidence levels*, explicitly embracing variability
rather than pretending it away. Notably it needs throughput data (items finished
per period), not per-task hour estimates.

- [Monte Carlo simulations and flow metrics](https://www.55degrees.se/blog/post/agile-forecasting-monte-carlo-simulations-and-flow-metrics)
- [Leveraging Monte Carlo for predictability](https://medium.com/leading-edje/agile-forecasting-leveraging-monte-carlo-simulations-and-flow-metrics-for-predictability-8be800b47d77)

**Consequences**

- ⚠️ **Contradicts the earlier deterministic hours-maths and the
  "last responsible moment" design.** Last-responsible-moment is a just-in-time
  concept that assumes predictable throughput; it deliberately removes slack,
  which is precisely wrong for bursty output.
- Forecasts are stated as **confidence, never certainty**.
- The needed data (completions per week) is collected passively and already
  exists (20 completions today, vs 7 usable session durations).

**Cycle phase as a forecast covariate (optional).** Perceived work productivity
is significantly more negative during the pre-bleed and bleed phases and more
positive in late follicular / early luteal; a mid-luteal cognitive advantage is
documented — though it disappears under high workload, and individual variation
is large.

- [Workplace productivity survey (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12398178/)
- [The Cycling Brain in the Workplace (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9201761/)

This matters architecturally for a reason beyond the biology: **cycle day is
arithmetic from a start date, not a self-report.** It is the one meaningful
capacity covariate that does not require introspection, which sidesteps the
interoception problem in §11.1 entirely.

Rules if implemented:

- **Stratify the user's own throughput history by phase** — never apply
  population-level claims to an individual.
- **Widen the confidence band; don't predict a bad day.** The forecast may
  account for the pattern silently. It must never say "you'll struggle this
  week" (that is both presumptuous and a demand — principles 3 and 5).
- **Strictly opt-in**, and useful only after several cycles of data.

### 3.6 Prior art, and the gap

[Tiimo](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)
is a neurodivergent-first *visual planner* — sensory-aware, routine-focused.
[Goblin Tools](https://futureaiblog.com/goblin-tools-ai-for-neurodivergent-individuals/)
does AI *task breakdown* and estimation, validating decomposition as a useful
pattern for this population.

**Neither offers a guarantee.** Tiimo helps you see a day; Goblin Tools helps you
break down a task. Nothing on the market says *"everything is held; nothing will
slip; you may stop carrying it."* That is the gap Studio OS fills.

### 3.7 Known data-quality facts (measured 2026-07-26)

Grounding, so no layer is designed on data that doesn't exist:

| Measure | Value |
|---|---|
| Session-end records | 10, across 4 tasks (2 tasks have >1) |
| Corrupt/unusable sessions | 1 × 72.6h (corrected to 3h), 2 × <1min |
| Usable session durations | ~7 |
| Task completions | 20 (15 with a usable capture→done span) |
| Active tasks | 19 |
| Active tasks **with any date** | **2** |
| Active tasks with no work mode | 5 of 19 |

**Two conclusions.** (a) No duration estimator is currently trustworthy from any
angle — per-mode samples are n=2–4 with unstable medians. (b) **The date drought
is the bigger problem**: a perfect estimator over undated tasks does nothing.
Getting dates onto commitments matters more than estimating effort.

**But undated ≠ unmeasurable.** Every task carries `parkedAt` — capture time —
so *every* task has an **age**, whether or not it has a date. Age is
deterministic, needs no history, works on day one, and is already partially used
(`isStaleParked` in `parked.ts`). This substantially defuses the date drought:
the 17 undated tasks are not featureless, they are *sortable*, and age gives the
completeness invariant (§5.1) a universal fallback so nothing depends on the user
having supplied a date.

Age must feed **ordering and review**, not pushes. "This has sat for 3 months" is
information; turning it into a recurring nag would violate principle 3.

---

## 4. Design principles (the constitution)

These are binding. A feature that violates one is wrong, however useful it seems.

1. **Never state a number the system hasn't earned.** Confidence travels with
   every estimate; the UI never renders an unearned value as fact. *(§3.7)*
2. **The guarantee never depends on a guess.** Completeness and commitment
   protection use dates and calendar facts only — no estimates, no history, no
   AI. *(§1)*
3. **Never escalate.** Ignored items repeat differently or reduce their demand.
   Pressure never increases. *(§3.3)*
4. **Always offer a real choice**, including "not now" and "drop it". *(§3.3)*
5. **Never moralise.** State arithmetic, never judgement. No "you're behind."
   *(§3.2 — inertia is not procrastination)*
6. **Never interrupt an active attention channel.** *(§3.1)*
7. **Interruption is a budgeted, scarce resource.** Batch to transition points;
   a hard daily ceiling. *(§3.1)*
8. **Silence must be unambiguous.** A quiet system and a broken system must never
   look the same — hence the daily all-clear. *(§1)*
9. **Announce degradation loudly.** When inputs are stale or delivery is failing,
   say so and pause dependent claims. *(§1)*
10. **No gamification.** No streaks, scores, badges, rewards. *(§3.3)*
11. **Reduce activation energy rather than increasing urgency.** *(§3.2)*
12. **The user can always override.** The system advises; it never locks.
13. **Hide what isn't now.** Once the user is inside a chosen block of work,
    everything not relevant to it is actively suppressed. Being able to dig into
    an admin day *without holding the rest* is the point of the product; a
    dashboard that shows everything all the time recreates the anxiety it exists
    to remove. *(§3.1 — monotropic split)*
14. **AI is optional and removable.** It ships off by default, is a user choice,
    and no guarantee may depend on it. *(§1)*
15. **Never end anything abruptly.** Stops are announced and counted down, with
    honest times. *(§3.2)*
16. **Never ask the user to introspect on demand.** Capacity information is
    inferred, derived from arithmetic (e.g. cycle day), or collected
    retrospectively at day-close — never by interrupting to ask "how are you
    feeling?", which is itself a demand. *(§3.3, §11.1)*
17. **Cap the user-facing vocabulary.** The internal model may be as rich as it
    needs to be; the surface must not be. **No more than five concepts are ever
    named to the user.** Everything else stays internal and unnamed. A product
    whose purpose is to stop you holding things cannot itself demand that you
    hold a taxonomy — and this design has accumulated at least thirteen
    candidate concepts, so without a hard cap the sprawl is guaranteed. *(§1)*

---

## 5. Architecture — three layers

Earlier designs failed because these three jobs were mashed together. They have
different logic, different data, different failure modes, and different
cold-start behaviour. **They must be separable: turning off Layers B and C must
leave the promise in §1 intact.**

```
Layer A — GUARANTEE   deterministic · dates only · works day one
    "Nothing is lost. Commitments to people are protected."
                 ↓ (never depends upward)
Layer B — FORECAST    probabilistic · throughput · silent until earned
    "Are we going to make it? — with what confidence?"
                 ↓
Layer C — INITIATE    cue-anchored · decomposed · low-demand
    "Help it actually start. And stop."
```

### 5.1 Layer A — Guarantee

**Job:** make it structurally impossible to silently lose something, and protect
obligations to other people.

**Inputs:** tasks, their dates, calendar events, the week plan, plus two
*factual* history items — `parkedAt` (age) and completion events (loop closing).
**No statistical history. No estimates. No AI.**

**Definition — "active".** A task is *active* when it is not done, not archived,
and not on the shelf. The completeness invariant applies to exactly this set;
everything else is out of its scope by definition.

**The completeness invariant.** Every active task is in exactly one of two
states, always:

- it has a **next-surface trigger** (a date or a cue), or
- it is **explicitly dormant** — and dormant items still **age** (§3.7), which
  orders the weekly review sweep, which is itself nudged.

There is no third state. Because every task has a `parkedAt`, age is a
**universal fallback**: the invariant never depends on the user having supplied a
date. This is testable and must be enforced by an exhaustiveness test (§9).

**Capture is part of the guarantee.** The promise in §1 is *"nothing you've
captured will fall through"* — which quietly means **the guarantee only covers
what made it in.** If capture is effortful, things never enter the system at all,
and that is the largest hole in any trusted-brain product: it fails silently and
invisibly, because you cannot miss what was never recorded.

So the barrier to entry is a first-class concern of Layer A, not a UI nicety.
**Voice is a required capture modality** (§11.9), because speaking is far cheaper
than typing-plus-categorising when executive function is taxed — which is
precisely when things get dropped.

Two properties keep this inside the guarantee rather than dependent on AI:

1. **Transcription is not interpretation.** Speech → text is a utility. Text →
   structured fields is a separate, optional step.
2. **The deterministic parser already exists.** `parse.ts` / `capture-parse.ts`
   already extract project, life area, work mode, do-plan and deadline from
   free text. A transcript is just text, so **voice capture works end-to-end with
   no AI at all.** If parsing fails or is off, the raw transcript becomes the
   task and nothing is lost.

A likely secondary benefit: spoken capture tends to carry context that typed
capture omits — *"email the venues about October dates before the end of the
month"* contains a person, a category and a date, all of which a form makes you
enter separately. This is a plausible partial remedy for the date drought
(§3.7), and should be measured rather than assumed.

**Protected commitments.** Obligations to other people are a first-class class,
not a tag: reply-owed (`needsRespond` / `respondByDateKey`), waiting-on, and
deadlines attached to a person or external body. They surface with lead time and
never depend on a forecast.

**Waiting-on needs a direction (change).** Today `waitingOn` means only "I am
blocked on them." It must carry a direction:

| Direction | Meaning | Behaviour |
|---|---|---|
| `them` | I'm blocked on someone | Don't ask the user to work it. Chase *them* on a derived deadline. |
| `me` | **Someone is waiting on me** | Protected commitment. Gets lead time, an implied respond-by, and loop-closing. |

`direction: "me"` is the most direct representation of the fear this product
exists to answer, and today the data model cannot express it at all.

**Derived deadlines (new).** If something you owe depends on someone else, *their*
deadline is computed backwards from yours and protected separately. If a grant is
due the 14th and needs Sam's letter, Sam's deadline is (say) the 7th — and it is
chased on the 5th, not the 12th. This is the single highest-value mechanism for
"am I letting someone down."

**Loop closing (new).** Completion and delivery are different events. Finishing a
mix without sending it is the most common way to disappoint someone while doing
all the work. Delivery gets its own trigger.

**Structural feasibility (deterministic).** *Does any path exist at all?* — zero
remaining windows before a deadline is arithmetic, not forecasting, so it
belongs here. It is stated plainly and early, with options, never as alarm.

**The daily message (decided).** The all-clear and the daily digest are **the
same message** — one scheduled notification per day that says either:

> ✓ Nothing at risk. 4 things scheduled this week; nobody is waiting on you.

or

> 2 things need you today — the grant is getting tight, and Sam's been waiting
> 9 days.

This resolves the conflict between principle 8 (silence must be unambiguous) and
principle 7 (interruption is scarce): one slot satisfies both. A day with nothing
to say still produces a message, because **the absence of bad news must itself be
delivered** — otherwise silence and breakage look identical and the user keeps a
mental backup, which defeats the product.

**Health reporting.** Calendar staleness, push-delivery failure, sync failure,
and permission loss are surfaced, and any claim that depends on a degraded input
is paused rather than computed on bad data.

**Cold start:** fully functional on day one with zero history.

### 5.2 Layer B — Forecast

**Job:** answer *"are we going to make it?"* honestly, including "I don't know
yet."

**Method:** Monte Carlo over historical **throughput** (items completed per
week), not per-task hour estimates (§3.5). Output is a confidence band.

**Two distinct models — do not conflate them.** They answer different questions,
need different data, and fail in different ways.

| | **Window counting** | **Throughput forecasting** |
|---|---|---|
| Question | "Is there room for *this* thing?" | "How much of my work lands by date X?" |
| Data | Calendar + stamped mode-days + **a user-supplied size** | Completion history (Monte Carlo, §3.5) |
| Scope | One task | The backlog in aggregate |
| Needs history? | No | Yes |
| Silent when | No size supplied | Too little history |

⚠️ **Layer ownership — window counting is a shared primitive, not Layer B.**
Counting windows is pure arithmetic over calendar and mode-days, and **Layer A
depends on it** for structural feasibility ("does any path exist at all?", §5.1).
Since Layer A may never depend upward, the *counter* belongs to A and Layer B
owns only the **interpretation** of the count — comparing it to a size (slack)
and forecasting throughput. Getting this backwards would put a probabilistic
layer underneath the guarantee.

**Unit of work.** Prefer counts over durations:

- **Windows** — how many plausible work windows exist before the deadline (from
  calendar + mode days). Counting windows is robust to variance because the
  variance lives *inside* a window, not in the count.
- **Sittings** — a size unit the user can actually estimate, and one the app
  already records.
- **Subtask ticks** — already logged with timestamps, and immune to the timer
  corruption in §3.7. The best available progress signal.

⚠️ **"Windows needed" is an estimate, and §3.7 says we cannot earn one.** It may
therefore come **only from the user**, never from inference. With no user-supplied
size, window counting still states the half it knows — *"there are 4 windows
before Friday"* — and says nothing about sufficiency. Inferring a size to fill
the gap would violate principle 1.

**Open (§11.10):** what a window means for a task with **no work mode** — 5 of 19
active tasks have none, so this is not an edge case.

**Slack, not precision.** When a size *has* been supplied, the useful output is
room for a bad day:

| Windows vs needed | Meaning |
|---|---|
| 6 vs 3 | comfortable — can lose half |
| 4 vs 3 | thinning |
| 3 vs 3 | every one must land ← the moment worth mentioning |
| 2 vs 3 | doesn't fit; renegotiate while it's cheap |

**Bias to slack, not efficiency.** Because output is bursty, the correct strategy
is to *start early and bank windows*, never to schedule at the last responsible
moment (§3.5).

**Confidence gate.** The layer stays **silent** until it can speak honestly.
Silence is the default, not the exception.

**Never blames.** Recompute after a low day with no judgement: *"Yesterday didn't
happen. 5 windows left, needs ~3. Still fine."* (Principle 5.)

**Cold start:** silent. Degrades to Layer A's structural feasibility, which needs
no history.

### 5.3 Layer C — Initiate

**Job:** convert "this should happen" into "this started" — and help it stop.

**Cue-anchoring (§3.4).** Triggers attach to real anchors, not clock times. Cues
split into two kinds, and the distinction is load-bearing:

**System-observable cues** — the app can detect these, so it can actually fire on
them. All of these exist today:

| Cue | Source |
|---|---|
| A calendar event ends | Google Calendar (already integrated) |
| A work session ends | Sessions / activity log |
| A task is completed | Activity log |
| The app is opened | Client |
| Day close / day start | Existing day-close ritual |
| A date arrives | Deterministic |

**User-observed cues** — "after my coffee", "when I get back from the school
run". The app **cannot** detect these, and must not pretend to. They still work,
because implementation intentions get much of their power from the *pre-deciding*
itself (§3.4). So the system stores them as written if-then plans and shows them
next to the relevant moment — it never claims to trigger on them.

⚠️ **Routines do not exist in Studio OS yet.** §3.4's "daily routine" anchors
have no data model behind them. For v1, cue-anchoring uses only the
system-observable list above; recurring calendar events act as proxy routines. A
real routines feature is a candidate follow-on, not a dependency.

**The four blockers (§3.2).** Before asking for a start, reduce:

| Blocker | System response |
|---|---|
| Vague | name a concrete next physical action |
| Multi-step | decompose; point at the next undone step only |
| Socially loaded | draft the message/email so the demand is smaller |
| Sensory-demanding | surface it so it can be planned into a good slot |

The nudge points at *"draft the budget section (~1 sitting)"*, never at
*"finish grant narrative."* A wall versus a door.

**Stopping support (new, §3.2).** Sessions get transition warnings, a runaway cap
with a recovery prompt, and end-of-day landing. "Stuck in motion" is a supported
state, not a data error.

**Batching (§3.1).** Plans minimise attention-channel switches. Work-mode days
become the real unit of planning.

**Tone.** Governed by principles 3, 4, 5, 10 — see §7.

**Cold start:** fully functional; needs no history.

### 5.4 Server-side requirements (decided)

The system must work **while the app is closed**, which is the whole premise
(§2). That imposes infrastructure the app does not currently have.

**Calendar must be readable server-side (DECIDED — option b).** Today calendar
events are fetched in the browser and cached in `localStorage`
(`studio-os.gcal-events.v1`); they are **not** in `cloud-sync.ts`, so Supabase has
no calendar data at all. Without server access, calendar-anchored cues cannot
fire when the app is closed, windows cannot be counted, and a shrinking runway
goes unnoticed — i.e. Layer C barely functions.

**Decision:** store a Google **refresh token** server-side so edge functions can
read the calendar directly.

Half the plumbing already exists: the login flow already requests
`access_type: "offline"` with `prompt: "consent"`, so a refresh token is already
being issued — it simply isn't persisted anywhere a server can use it.

Required, non-negotiable, because this is a real security surface:

- **Encrypted at rest**, never exposed to the client.
- **RLS-scoped** so a row is only ever readable by its owner.
- **Minimum scope** — `calendar.readonly` only; do not widen for convenience.
- **A revocation path** the user can trigger, and which the app honours
  immediately.
- **Treated as degradable** (principle 9): if the token is revoked or refresh
  fails, say so and pause every claim that depends on the calendar.

**Email as the escalation channel (DECIDED).** Push is the primary channel, but
iOS web push is the least reliable delivery path in the stack, and a trust system
whose delivery silently dies is the exact failure mode this document exists to
prevent. When push fails or the user hasn't opened the app in N days, the daily
message escalates to **email**. Requires an email sender (e.g. Resend/Postmark)
wired to the edge function.

**Reconciliation (open, §11.11).** With local-first state plus a server that
sends notifications, a nudge can fire for something already completed offline.
Needs an explicit rule before delivery ships.

---

## 5.5 Surface boundaries — what belongs where

Three surfaces, three jobs. Blurring them was a real implementation mistake
(caught in review: the panel listed the user's own plan back to them under
"7 things need you", of which 5 were simply *planned*).

| Surface | Job | Cadence |
|---|---|---|
| **Week planning** | Decide what happens this week | Weekly |
| **Today** | What you're doing today | Daily |
| **Trust core** | Guarantee nothing escapes the other two | **Only by exception** |

**The trust core is the smoke alarm, not the thermostat.** When planning is
working it is silent. It speaks only when planning has failed or cannot help —
and that same exception set is exactly what earns a push notification (§7).

**The rule that keeps them separate:** if a task is planned *for today*, Today
already has it, so the trust core stays out of it. Three cases:

| Case | Treatment | Why |
|---|---|---|
| Planned **for today** | Silent — Today's job | Repeating it makes this a second Today view |
| Planned **in the past**, undone | Quiet line, does *not* block the all-clear | It fell off Today, but §6.1 says a slipping "doing by" is information, not an alarm |
| **Anything else due** — deadlines, commitments to people, handoffs, unplanned recurring | Listed, and push-worthy | Nothing else would catch it |

Consequence worth stating plainly: **the all-clear can be true while work is
scheduled.** "Everything's held" means *nothing is at risk*, not *nothing is on
today*. A user with a full, working plan should still get to exhale.

---

## 6. Week planning integration

The weekly ritual is where Layer A and Layer B become visible, and where the
current implementation has a real hole.

**Known defect.** `trustCheckLines()` (`src/lib/week-planning-approve.ts`) only
examines tasks the user has **already approved**, and only those whose deadline
falls **inside the current week**. It therefore cannot catch the two failures
that actually occur: forgetting to approve something, and a task due later that
needed to *start* this week. It also checks only whether a matching mode-day is
*stamped*, not whether there is enough of it.

**Status: partially built.** Items 1 and 3 below are implemented in
`src/lib/trust/week-check.ts` + the Approve step. Items 2, 4 and 5 need window
counting, which needs the calendar server-side — deliberately *not* faked
(principle 1).

| # | Change | Status |
|---|---|---|
| 1 | Run over all tasks | ✅ built |
| 2 | "Must start this week" from runway | ⛔ needs items 6 + 9 |
| 3 | Warn on un-approving a commitment | ✅ built |
| 4 | Mode check: presence → sufficiency | ⛔ needs a size estimate |
| 5 | Whole-week feasibility at lock | ⛔ needs windows |
| 6 | Locked plan becomes the capacity model | ⛔ follows 5 |

**Required changes**

1. **Run over all tasks, not just approved ones.** The safety net must not depend
   on the user having already made the right choice.
2. **Add a "must start this week" section**, derived from window counting on
   *later* deadlines. This is how a task due the 14th shows up in this week's
   planning.
3. **Pre-approve runway-critical items**, and push back (with choices) when one
   is un-approved: *"Un-approving this means the grant can't land on time. Move
   the deadline · cut scope · un-approve anyway."*
4. **Upgrade the mode check from presence to sufficiency** — "2 creative days
   stamped, needs ~3 sittings" rather than "creative covered."
5. **Whole-week feasibility at lock time** — surface over-commitment on Sunday,
   when it is still cheap to fix.
6. **After locking, the plan is the capacity model** — runway counts stamped
   mode-days, not raw calendar gaps.

### 6.1 "Doing by" replaces "doing date" (data-model change)

Today `doPlan` names a **specific day** to do something. In practice this fights
the week plan: the chosen day's mode often doesn't match the task, and the exact
day rarely matters.

**Change (DECIDED):** `doPlan` becomes a soft **"by" target** with either day or
week granularity — *"by Thursday"*, *"by next week"*. This is a **rename and
semantic change of the existing field**, not a second field alongside it — two
co-existing concepts would violate principle 17.

⚠️ **Blast radius.** The current "do it *on* this day" meaning is depended on by
`do-plan.ts`, `week-focus.ts`, the Today mode bench, the lenses, sort keys, and
the week-planning wizard. Existing stored `doPlan` values must be migrated, and
every consumer re-read against the new meaning. Treat this as a dedicated piece
of work with its own tests — not a rename.

This is not just laxer; it **inverts the planning flow**. Instead of the user
guessing days and the system checking them, the system can *derive the week's
shape from the work*:

> Three admin things want to be done by Thursday. **Suggest an admin day Tuesday.**

That is monotropism-aligned batching (§3.1) generated automatically, and it is
the mechanism that makes week planning feel like it's doing work *for* the user
rather than demanding decisions from them.

**It also resolves deadline-vs-intention**, which the current model conflates:

| | Meaning | Treatment |
|---|---|---|
| **Deadline** | External, real consequence, not movable (grant closes) | Protected commitment; runway; feasibility warnings |
| **Doing by** | The user's own soft intention | Drives week-shape suggestions; may slip **without alarm** |

A deadline slipping is a problem. A "doing by" slipping is just information —
and treating them identically is a fast route to alarm fatigue and demand
pressure (principle 3).

---

## 7. Interaction and language

**Notification budget.** Batched at transition points; never during an active
session; quiet hours respected, timezone-aware for touring.

**Ceiling (decided).** **One** scheduled daily message (§5.1). Everything else
waits for it — *unless it meets the urgency criterion below.*

**The urgency gate (replaces a numeric cap).** An unscheduled interruption is
permitted **only** when waiting until tomorrow's message would cause real harm.
Proposed definition — needs confirmation (§11.12):

1. A **protected commitment to another person** breaches today, or
2. A **hard deadline** becomes structurally infeasible today (§5.1), or
3. The **active session itself** needs a transition warning (§3.2).

Nothing else qualifies. Note that (3) is the only one allowed to land *during* a
session, and it is about the session, not about other work — so principle 6
(never interrupt an active attention channel) survives intact.

**Voice rules**

| Never | Instead |
|---|---|
| "You must do this today." | "The grant needs about 3 sittings — there are 3 windows before it's due." |
| "You're behind." | "Yesterday didn't happen. 5 windows left, needs about 3." |
| "⚠️ URGENT — 4th reminder" | (repeat differently, or shrink the ask) |
| "3-day streak!" | (nothing — principle 10) |
| "Only 3 chances left!" | "Windows are getting tight." |
| "This takes 6 hours." | "There are 4 windows before Friday." |

Note the last two: **hours framing and depletion framing are both banned** —
hours because they were superseded by windows (§5.2), depletion because scarcity
language is itself pressure (§11.5).

**Always offer an out.** Every prompt includes a genuine non-action option
("not now", "drop it", "move the deadline"). Autonomy is a feature, not a
courtesy.

---

## 8. Failure modes

| Failure | Required behaviour |
|---|---|
| Calendar stale | Pause capacity claims; say so |
| Push delivery failing | Detect, report, **escalate to email** (§5.4) |
| Not opened in N days | Assume delivery may be failing; verify, then **email** |
| Calendar token revoked / refresh fails | Pause all calendar-dependent claims; say so (§5.4) |
| Sync down | Local-first continues; flag divergence |
| No estimate available | Say the reliable half; ask, don't guess |
| Corrupt session | Quarantine, show, offer correction (never silently average) |
| Deadline unreachable | State plainly + options, early, without alarm |

---

## 9. How this gets proven

Trustworthiness is a testable property, not a claim.

- **Exhaustiveness test.** Generate tasks across every meaningful combination of
  fields — dated/undated, overdue, waiting, done, malformed, contradictory — and
  assert *none* is unclassified and every one is either triggered or dormant-and-
  swept. A future rule that opens a hole fails this test immediately.
- **Time-edge tests.** DST transitions, midnight boundaries, timezone travel,
  malformed date keys, far-past and far-future dates.
- **Guarantee tests.** Each promise in §1 and each principle in §4 that is
  mechanically checkable becomes a named test.
- **No-silent-failure tests.** Every degraded input produces a visible signal.

---

## 10. Out of scope for v1

| Excluded from v1 | Why / status |
|---|---|
| All AI | The trust layer must stand alone (principle 2). When it does arrive it is an **optional module, off by default and user-selectable** (principle 14) — never a mandatory part of the product. |
| In-the-moment "how are you feeling?" | Rejected outright, not deferred — it is itself a demand (principle 16). Replaced by day-close capture (§11.1). |
| Body doubling | Unresearched; separate concern. |
| Project/release critical path | Real need (tours, releases) but v2 — depends on Layer A being solid. |
| Cycle-phase forecasting | Designed (§3.5) but needs several cycles of data; opt-in, v2. |
| Message-platform integration (Beeper) | Feasible and high-value; see below. v2+, and never a dependency. |
| ~~Voice capture~~ | **Now in scope for v1** — capture friction is a hole in the guarantee (§5.1). Long-form journaling remains open (§11.9). |
| Sharing / multi-user | Out of scope entirely. |

### Message-platform integration (assessed 2026-07-26)

Auto-detecting *"someone is waiting on me"* would be the strongest possible feed
into `waitingOn.direction: "me"` (§5.1). Beeper's Desktop API was checked
directly:

- ✅ Real-time events exist — an experimental WebSocket with
  `subscriptions.set` accepting `chatIDs: ["*"]`.
- ✅ Chats and messages can be listed; messages can be sent (so replying in
  Studio OS is possible, and a reply in Beeper could clear the item — no
  double-management).
- ⚠️ **It is a *localhost* desktop API** (`localhost:23373`). It is only
  reachable from her own machine while Beeper Desktop is running. A phone PWA
  cannot reach it, and neither can a Supabase edge function. It therefore needs a
  small bridge process running on the computer.
- ⚠️ **Privacy.** This means a program with access to all her messages. The
  minimal viable version should use **metadata only** — "the last message in this
  chat is from them, and it's been N days" — which is high-signal and avoids
  reading content.
- ⚠️ **Availability.** If the laptop is off, the bridge is down. Per principle 9
  it must be treated as a degradable input that announces staleness, and per
  principle 2 the guarantee layer must never depend on it.

**Verdict:** genuinely valuable enrichment, real infrastructure cost, strictly
additive. Not v1.

### Known gaps — identified, not yet designed

These surfaced during design discussion and were never rejected. They are
recorded here so they don't get lost a second time.

**Confirmed for v1:**

| Gap | Why it matters |
|---|---|
| **Recurring obligations** | `recurrence` exists in `types.ts` but is referenced **nowhere in planning code** — timesheets, quarterly taxes, prescription refills are invisible to the entire planning system. They are the *definition* of "things you shouldn't have to hold", and since the data model already exists this is wiring, not inventing. |
| **Intake / triage debt** | 17 undated tasks today and the number only grows. Without bounded, rhythmic triage the dormant pile becomes where things go to die — breaking the promise quietly, which is the worst way. Must be bounded (a few at a time, via §5.1's review sweep), never a backlog dump. |

**Deferred to v2 — documented in full so the intent isn't lost:**

**Low-power mode.** When the user is overwhelmed, collapse to the two or three
things that genuinely cannot slip and **actively hide everything else** —
principle 13 taken to its conclusion — then restore the full picture afterwards.
Entry should be one deliberate action; exit should be easy and non-punishing; and
nothing hidden may be *lost* (the guarantee still holds underneath). Prior art is
the user's own: a `low_power_mode_sessions` table already exists in their separate
Dispatch project, so the concept is theirs, not imported.

**Saying-yes protection.** The highest-leverage moment in the entire system is
*before* a commitment is made. Given a proposed obligation ("can you have it by
the 10th?"), check windows and show what would break: *"If you say yes, the grant
and Kim's mix both get tight."* Everything else in this document is damage
control by comparison. Deferred only because it needs window counting (item 9)
and protected commitments (item 4) to exist first.

**Disruption recovery.** A lost week — illness, crisis, a bad stretch — shifts
every runway at once. Nothing currently re-plans, so the user returns to a
quietly-broken week at their lowest capacity, exactly when they can least afford
to reconstruct it. Wanted: a "here's what changed, here's what I'd move" flow
that does the re-planning *for* them and asks only for confirmation. Must obey
principle 5 — a lost week is never framed as a failure.

**Depleted / recovery days.** Free hours ≠ capacity. After a gig, travel, or a
heavy social day, a "free" window is not a working window, and window counting
currently treats them as identical. Wanted: a notion of reduced-capacity days so
the system plans *around* recovery rather than scheduling into it. Blocked on
§11.1 — it must be derived or retrospective, never an in-the-moment self-report.

---

## 11. Open questions

1. **Interoception — direction settled, detail open.** Asking in the moment is
   rejected (principle 16). Capacity information comes from three places
   instead: arithmetic (cycle day, §3.5), observed behaviour (sessions, subtask
   ticks), and a **retrospective prompt in the existing day-close ritual** —
   "what did today actually look like?" Retrospective report is more reliable
   than momentary introspection and attaches to a ritual that already exists, so
   it adds no new demand. *Open:* exactly what day-close asks, and how few taps
   it can be.
2. **Transition support — researched, see §3.2.** Warning then countdown, honest
   times, soft check-in rather than hard cut. *Open:* default warning interval.
3. **Energy accounting / spoon theory** — still worth evaluating, but inherits
   the same constraint as (1): it must be derived or retrospective, never an
   in-the-moment self-report.
4. **What counts as a "window"** — confirmed *not* a static weekly number. It
   must be derived per-week from the actual calendar and stamped mode-days (and
   possibly cycle phase). *Open:* the derivation rule, **and** what a window
   means for a task with no work mode (§11.10).
5. **RESOLVED — the word is "windows", and the named five are fixed.** A unit of
   opportunity is a *window*. Phrase it as capacity, not depletion:
   ✅ *"there are 4 windows before Friday"*, *"windows are getting tight"* —
   ❌ *"only 3 chances left"*, which is scarcity framing and reads as a demand
   (principle 3).

   **The five user-facing concepts (principle 17):**

   | Named | Meaning |
   |---|---|
   | **Windows** | Chances to work on something |
   | **Doing by** | Your own soft intention |
   | **Deadline** | External, real consequence |
   | **Waiting on** | A person is involved (either direction) |
   | **Today** | What's live right now |

   Everything else — dormancy, age, cues, protected commitments, derived
   deadlines, structural feasibility, health, throughput, slack — stays
   **internal and unnamed**. Revisit only after real use; the user has flagged
   this may change once it's felt in practice.
6. **RESOLVED → §6.1.** Hard vs soft is the deadline-vs-"doing by" distinction.
7. **Demand-avoidance calibration — deferred by the user; revisit before Layer C
   ships.** Current
   research support: [invitational and declarative phrasing](https://www.scienceworkshealth.com/post/low-demand-autonomy-supportive-therapy-for-pda-style-demand-avoidance-low-demand-therapy-demand-av),
   genuine choices (a choice that excludes "not at all" is not a real choice),
   and sometimes dropping the reminder entirely.
8. **Clarification of a stale-fields note.** Earlier this session, before the
   research, nudge fields were added to `Task` in code: `nudgeType:
   "timed"|"checkin"`, `leadTimeDays`, `leadTimeSource`, `startThinkingAtDateKey`,
   `acknowledgedAt`. Some are now obsolete — `timed|checkin` assumed clock-based
   triggering, which cue-anchoring replaces (§3.4/§5.3), and `leadTimeDays`
   assumed hours-maths, which window counting replaces (§5.2). They must be
   revised before anything is built on them. `acknowledgedAt` probably survives.
9. **Voice capture — REQUIRED, not optional.** Confirmed as essential for **task
   input** as well as journaling. See §5.1: capture friction is a hole in the
   guarantee itself, so this is a Layer A concern.

   **Two use cases, different requirements:**

   | | Task capture | Journaling |
   |---|---|---|
   | Length | seconds | minutes |
   | Latency | must feel instant | tolerant |
   | Output | parsed into a task | retained as text |
   | Network | should survive being offline | can require network |

   **Transcription options**, cheapest-first:

   - **Native OS dictation** (the keyboard mic). Free, zero infrastructure, no
     audio ever leaves the user's control, and on iOS it is the *reliable* path.
     The app only needs a text field — it implements no voice at all.
   - **Web Speech API.** Good on Chrome desktop; historically patchy on
     Safari/iOS. Usable as an enhancement, never as the only route.
   - **Cloud transcription** (e.g. Whisper-class). Best quality and best for
     long-form journaling, but adds cost, latency and a privacy surface.

   **Recommendation:** layer them — native dictation as the baseline that always
   works, Web Speech where supported, cloud only for long-form. This gets voice
   capture shipped with essentially no infrastructure.

   **Audio retention:** discard audio after transcription **by default**; keeping
   recordings is opt-in. Transcript is the artifact.

   **A convergence worth designing for:** if day-close asks *"what did today look
   like?"* (§11.1) and the answer can be **spoken**, then one action produces both
   a journal entry and the capacity signal — no new demand, two outputs. That is
   probably the right first home for journaling in this product.

   *Open:* whether long-form journaling belongs in Studio OS or is a separate
   surface;
   [Lound](https://lound.ai/blog/ai-journaling-apps-2026-buyers-guide/) is the
   reference for voice-first capture with pattern-surfacing over time.
10. **RESOLVED — mode-less tasks are prompted during week planning.** Window
    counting matches a task's mode against stamped mode-days, and **5 of 19
    active tasks currently have no mode** (they exist but are easy to miss in the
    UI, which is part of the problem). Rather than guessing a fallback, the week
    planning ritual **asks the user to assign a mode** to any mode-less task it is
    about to plan. This fits the existing ritual, requires no inference, and
    quietly fixes the data as a side effect of normal use. Until a mode is
    assigned, such tasks are excluded from window counting and the system says so
    rather than silently treating them as fitting anywhere.
11. **Local-first vs cloud reconciliation.** A server-fired nudge could fire for
    something already completed offline on another device. Needs an explicit
    rule (e.g. server checks `updated_at` before sending, client suppresses
    stale notifications on open). Currently unspecified.
12. **Define "urgent" precisely.** The numeric interruption cap was replaced by a
    qualitative gate (§7), which is better but only as good as its definition. A
    vague "urgent" will drift wider over time until the ceiling is meaningless —
    the classic way notification budgets die. Proposed: breaching a protected
    commitment today · a hard deadline becoming infeasible today · a transition
    warning for the active session. **Needs confirmation, and should be encoded
    as a test** so the definition can't quietly expand.

---

## 12. Build order

Nothing starts until this document is agreed.

| # | Work | Layer | Depends on |
|---|---|---|---|
| **0** | **Normalise date representation.** `deadlineInDays` (offset) and `deadlineDateKey` (YYYY-MM-DD) coexist across the codebase, and **offsets silently rot** — a task stored as "in 3 days" means something different tomorrow. **Canonical form: absolute date keys** (`YYYY-MM-DD`, local, via `local-date.ts`); offsets become *derived at read time*, never stored. Covers `deadlineInDays`/`deadlineDateKey`, `respondByDateKey`, and the offset inside `doPlan` (which item 10 replaces anyway). **A spec already exists as failing tests** — `do-plan.test.ts > absolute day plans` describes the target API (`dayPlan(n, from)` returning `{kind:"day", dateKey}`, `doPlanDayOffset(plan, now)`, `normalizeDoPlan(legacy, null, parkedAt)`, `normalizeDeadlineDateKey(...)`), including migrating legacy offsets anchored on `parkedAt`. Item 0 = make those pass. Related red suites in the same blast radius: `recurrence.test.ts` (3), `recipes.test.ts` (1). | A | — |
| 1 | **Voice capture** — native-dictation baseline into the existing parser (§5.1) | A | 0 |
| 2 | Session hygiene: runaway soft check-in + recovery prompt + outlier quarantine | C | — |
| 3 | Completeness invariant (date · cue · age) + exhaustiveness test | A | 0 |
| 4 | Protected commitments: `waitingOn.direction` + derived deadlines + loop closing | A | 3 |
| 5 | Recurring obligations — wire the existing `recurrence` model into planning (§10) | A | 3 |
| 6 | Server-side calendar access: refresh-token storage, encryption, revocation (§5.4) | — | — |
| 7 | Delivery: one daily message (all-clear ∪ digest), urgency gate, email escalation | A | 3, 6 |
| 8 | Health reporting (incl. calendar/token/delivery degradation) | A | 6, 7 |
| 9 | **Window** counting (calendar + mode days) — deterministic primitive, see §5.2 | **A** | 0, 3, 6 |
| 10 | "Doing by" migration (§6.1) + week-planning integration (§6) + mode prompt (§11.10) | A/B | 4, 9 |
| 11 | Bounded intake / triage sweep (§10) | A | 3 |
| 12 | Cue-anchored initiation + the four blockers | C | 4, 6 |
| 13 | Throughput forecasting, confidence-gated | B | 9 + more data |

Items 0–8 deliver the promise in §1 with **no estimates, no forecasting, and no
AI.** That is deliberate: if everything after item 8 were abandoned, the system
would still be trustworthy.

**Sequencing notes.**

- **Item 6 (server-side calendar) is the one most likely to be skipped, and must
  not be.** It is infrastructure with no user-visible output, but items 7, 9 and
  12 are all crippled without it — cues can't fire, windows can't be counted, and
  the daily message can't be assembled while the app is closed. Deferring it
  silently downgrades the product back into a passive app that must be remembered
  (§2), which is failure mode #1.
- **Item 7 can ship before item 9.** The daily message is useful with protected
  commitments and dates alone; window-based content ("getting tight") arrives
  with 9. Ship it early and let it get richer.
- **Item 9 is Layer A, not B** (§5.2). The *counter* is deterministic and the
  guarantee depends on it; only the interpretation of the count is Layer B.
