// Workspace v2 — Living doc refined.
// Long-scroll doc per product. Sticky TOC + sticky "ask claude" drawer
// docked on the right edge (collapsed by default; ⌘k or click to open).

const WorkspaceDoc = () => (
  <Frame label="hub.taliaduvet.com/vein/doc">
    <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 280px', height: '100%' }}>
      {/* ── Left · TOC sidebar ───────────────────────────────────── */}
      <div
        style={{
          background: W.paper2,
          borderRight: `1px solid ${W.ink2}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <Anno>← all products</Anno>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>Vein</div>
          <Pill variant="live" style={{ fontSize: 8.5, padding: '1px 6px' }}>live</Pill>
        </div>
        <Anno style={{ textTransform: 'none' }}>v1.3 · last edited 14m ago</Anno>

        <Anno style={{ marginTop: 10 }}>// contents</Anno>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            ['◐', 'Brief & vision'],
            ['●', 'Design decisions', true],
            ['◐', 'Current sprint'],
            ['○', 'Roadmap'],
            ['○', 'Analytics'],
            ['○', 'Support log'],
            ['○', 'Marketing'],
            ['○', 'Changelog'],
          ].map(([icon, t, active]) => (
            <div
              key={t}
              style={{
                display: 'flex',
                gap: 7,
                alignItems: 'center',
                fontSize: 12,
                color: active ? W.ink : W.ink2,
                fontWeight: active ? 600 : 400,
                background: active ? W.paper : 'transparent',
                padding: '3px 6px',
                borderRadius: 4,
                borderLeft: active ? `2.5px solid ${W.accent}` : '2.5px solid transparent',
                marginLeft: active ? 0 : 0,
              }}
            >
              <span>{icon}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Btn style={{ justifyContent: 'center' }}>preview app ↗</Btn>
          <Btn accent style={{ justifyContent: 'center' }}>publish update</Btn>
        </div>
      </div>

      {/* ── Center · Doc body ────────────────────────────────────── */}
      <div style={{ padding: '20px 40px 40px', overflow: 'auto' }}>
        {/* Doc title strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Anno>// living spec · Vein</Anno>
          <Anno>auto-saved · synced w/ claude</Anno>
        </div>

        {/* H1 */}
        <div className="wf-sketch" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, marginTop: 8 }}>
          voice-memo catalog for solo artists
        </div>
        <div style={{ fontSize: 13, color: W.ink2, marginTop: 6, lineHeight: 1.45, maxWidth: 540 }}>
          Vein is a private vault for the in-between sounds — the hummed melodies, the
          voice-noted lyrics, the takes you'll forget by morning. Built so the catching
          part stays fast and the searching part stays possible.
        </div>

        {/* Section: design decisions */}
        <div style={{ marginTop: 22 }}>
          <Anno>// design decisions</Anno>
          <div className="wf-sketch" style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>
            Transcribe button placement
          </div>
          <Anno style={{ textTransform: 'none', color: W.ink2, marginTop: 2 }}>
            decision · may 21 · paired w/ claude
          </Anno>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
            {[
              { k: 'A', label: 'bottom-right',  status: '' },
              { k: 'B', label: 'in-row, primary', status: 'chosen' },
              { k: 'C', label: 'long-press waveform', status: '' },
            ].map(opt => (
              <div
                key={opt.k}
                className="wf-box"
                style={{
                  padding: 8,
                  ...(opt.status === 'chosen'
                    ? { background: W.paper2, boxShadow: `0 0 0 2px ${W.accent}` }
                    : {}),
                }}
              >
                <ImgPlaceholder style={{ height: 80 }}>option {opt.k}</ImgPlaceholder>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    alignItems: 'center',
                  }}
                >
                  <Anno>{opt.k} · {opt.label}</Anno>
                  {opt.status && <Pill variant="accent">{opt.status}</Pill>}
                </div>
              </div>
            ))}
          </div>

          <div
            className="wf-box-soft"
            style={{
              padding: 10,
              marginTop: 10,
              borderLeft: `3px solid ${W.accent}`,
              fontSize: 12.5,
              color: W.ink2,
              lineHeight: 1.4,
            }}
          >
            <Anno style={{ marginBottom: 4 }}>// rationale</Anno>
            B keeps transcribe in muscle-memory zone while pushing "link song" below the fold.
            Tracks with how users actually used v1.2 (see analytics ↓ memo-screen heatmap).
            A felt too easy to miss; C surprised users who only swipe.
          </div>
        </div>

        {/* Section: sprint */}
        <div style={{ marginTop: 22 }}>
          <Anno>// current sprint · v1.4 ships jun 6</Anno>
          <div className="wf-box" style={{ padding: 12, marginTop: 6 }}>
            {[
              { i: '✓', t: 'iOS safe blob playback',        c: '#5a7a4e', age: 'mon' },
              { i: '▸', t: 'fragment transcribe retry',     c: W.accent2, age: 'today', cur: true },
              { i: '○', t: 'tag manager v2',                c: W.muted,   age: '' },
              { i: '○', t: 'home-screen shortcut copy fix', c: W.muted,   age: '' },
              { i: '○', t: 'analytics opt-in modal',        c: W.muted,   age: '' },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 12.5,
                  padding: '5px 0',
                  borderBottom: i < 4 ? `1px dashed ${W.paper2}` : 'none',
                  fontWeight: row.cur ? 600 : 400,
                  color: row.cur ? W.ink : W.ink2,
                }}
              >
                <span style={{ color: row.c, fontWeight: 700, width: 12 }}>{row.i}</span>
                <span style={{ flex: 1 }}>{row.t}</span>
                <Anno>{row.age}</Anno>
              </div>
            ))}
          </div>
        </div>

        {/* Section: analytics */}
        <div style={{ marginTop: 22 }}>
          <Anno>// analytics · last 30d</Anno>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6 }}>
            {[
              ['users', '142', '+12%'],
              ['memos', '1.2k', '+8%'],
              ['retention', '41%', '+3%'],
              ['mrr', '$0', '—'],
            ].map(([l, v, d]) => (
              <div key={l} className="wf-box-soft" style={{ padding: 8 }}>
                <Anno>{l}</Anno>
                <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                  {v}
                </div>
                <Anno style={{ textTransform: 'none', color: '#5a7a4e' }}>{d}</Anno>
              </div>
            ))}
          </div>
        </div>

        {/* Section: support log */}
        <div style={{ marginTop: 22 }}>
          <Anno>// support log · 3 open</Anno>
          <div className="wf-box" style={{ padding: 0, marginTop: 6 }}>
            {[
              { from: 'jamie@…', subj: 'transcribe fails on long memos', tag: 'bug', age: '2h' },
              { from: 'sam@…',   subj: 'can we group tags?',             tag: 'feature', age: '1d' },
              { from: 'el@…',    subj: 'lost recordings after PC switch', tag: 'urgent',  age: '2d' },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  borderBottom: i < 2 ? `1px solid ${W.paper2}` : 'none',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Anno style={{ minWidth: 30 }}>{m.age}</Anno>
                <span style={{ fontFamily: W.mono, fontSize: 11, minWidth: 80 }}>{m.from}</span>
                <span style={{ flex: 1, fontSize: 12.5 }}>{m.subj}</span>
                <Pill
                  variant={m.tag === 'bug' ? 'beta' : m.tag === 'urgent' ? 'accent' : ''}
                  style={{ fontSize: 8.5, padding: '1px 6px' }}
                >
                  {m.tag}
                </Pill>
              </div>
            ))}
          </div>
        </div>

        {/* Section: marketing */}
        <div style={{ marginTop: 22 }}>
          <Anno>// marketing · jun</Anno>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
            {[
              ['jun 1',  'teaser reel',    'instagram'],
              ['jun 6',  'launch v1.4',    'newsletter + hub'],
              ['jun 14', 'creator tour',   '3 partner posts'],
            ].map(([d, t, c]) => (
              <div key={d} className="wf-box-soft" style={{ padding: 8 }}>
                <Anno>{d}</Anno>
                <div className="wf-sketch" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
                  {t}
                </div>
                <Anno style={{ textTransform: 'none', marginTop: 2 }}>{c}</Anno>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right · Claude drawer (open) ────────────────────────── */}
      <div
        style={{
          borderLeft: `1.5px solid ${W.ink}`,
          background: W.paper,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px dashed ${W.ink2}`,
            background: W.paper2,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="wf-sketch" style={{ fontSize: 17, fontWeight: 700 }}>
              ✦ co-pilot
            </span>
          </div>
          <Anno>⌘K · close →</Anno>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: `1px dashed ${W.ink2}` }}>
          <Anno>context · § design decisions</Anno>
        </div>

        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          <div className="wf-box-soft" style={{ padding: 8, fontSize: 11.5 }}>
            <Anno style={{ marginBottom: 3 }}>// you · 14m</Anno>
            transcribe button feels lost. options?
          </div>
          <div
            style={{
              padding: 8,
              fontSize: 11.5,
              background: W.paper2,
              borderRadius: 6,
              borderLeft: `2px solid ${W.accent}`,
            }}
          >
            <Anno style={{ marginBottom: 3 }}>// claude · 13m</Anno>
            three options drawn ↑ — B keeps muscle memory, C is gestural risk.
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              <Btn style={{ fontSize: 9, padding: '3px 8px' }}>insert A</Btn>
              <Btn style={{ fontSize: 9, padding: '3px 8px' }}>insert B</Btn>
              <Btn style={{ fontSize: 9, padding: '3px 8px' }}>insert C</Btn>
            </div>
          </div>
          <div className="wf-box-soft" style={{ padding: 8, fontSize: 11.5 }}>
            <Anno style={{ marginBottom: 3 }}>// you · 8m</Anno>
            go with B. write the rationale into the doc.
          </div>
          <div
            style={{
              padding: 8,
              fontSize: 11.5,
              background: W.paper2,
              borderRadius: 6,
              borderLeft: `2px solid ${W.accent}`,
            }}
          >
            <Anno style={{ marginBottom: 3 }}>// claude · 7m</Anno>
            inserted into § design decisions →<br />
            "B keeps transcribe in muscle memory…"
          </div>
        </div>

        <div style={{ padding: 10, borderTop: `1px dashed ${W.ink2}` }}>
          <Anno style={{ marginBottom: 4 }}>// quick actions</Anno>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {['summarize sprint', 'draft changelog', 'reply to jamie'].map(a => (
              <span
                key={a}
                style={{
                  fontSize: 10,
                  fontFamily: W.mono,
                  padding: '3px 6px',
                  border: `1px dashed ${W.ink2}`,
                  borderRadius: 4,
                  color: W.ink2,
                }}
              >
                {a}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div
              className="wf-box-soft"
              style={{
                flex: 1,
                padding: 8,
                fontFamily: W.mono,
                fontSize: 11,
                color: W.muted,
              }}
            >
              ask, paste, sketch…
            </div>
            <Btn accent>↑</Btn>
          </div>
        </div>
      </div>
    </div>

    <Note style={{ position: 'absolute', right: 305, top: 8, transform: 'rotate(-2deg)' }}>
      drawer is collapsible ↘<br />⌘k to summon anywhere
    </Note>
  </Frame>
);

window.WorkspaceDoc = WorkspaceDoc;
