// Per-product workspace — where Talia works on ONE product with Claude.
// Workflow: design + finalize products. Plus roadmap/analytics/support
// nearby but not in the way.

// ─── Direction A: Design Lab (split with co-pilot) ───────────────
// Main canvas (current design surface) + persistent right-rail chat with
// Claude. Top tab strip for switching context inside the product.

const WorkspaceA = () => (
  <Frame label="hub.taliaduvet.com/vein">
    {/* Top */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 22px',
        borderBottom: `1.2px solid ${W.ink}`,
        background: W.paper2,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Anno>← all products</Anno>
        <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>Vein</span>
        <Pill variant="live">live · v1.3</Pill>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Anno>design · roadmap · analytics · support · marketing</Anno>
        <Btn>preview</Btn>
        <Btn accent>publish</Btn>
      </div>
    </div>

    {/* Sub-tabs inside design */}
    <div
      style={{
        display: 'flex',
        gap: 18,
        padding: '8px 22px',
        borderBottom: `1px dashed ${W.ink2}`,
      }}
    >
      {['library', 'memo', 'songs', 'recovery', 'settings'].map((t, i) => (
        <span
          key={t}
          className="wf-mono"
          style={{
            fontSize: 11,
            color: i === 1 ? W.ink : W.muted,
            fontWeight: i === 1 ? 700 : 400,
            borderBottom: i === 1 ? `2px solid ${W.accent}` : '2px solid transparent',
            paddingBottom: 4,
          }}
        >
          {t}
        </span>
      ))}
    </div>

    {/* Body: canvas + chat */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', height: 'calc(100% - 92px)' }}>
      {/* Canvas */}
      <div style={{ padding: 18, overflow: 'auto', background: W.paper2 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Anno>// designing · memo screen v2</Anno>
          <Anno>artboard 1 of 3</Anno>
        </div>

        {/* Mock device frame on canvas */}
        <div
          className="wf-box"
          style={{
            margin: '0 auto',
            width: 240,
            height: 360,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Anno>← back</Anno>
            <Anno>···</Anno>
          </div>
          <div className="wf-sketch" style={{ fontSize: 18, fontWeight: 700 }}>
            untitled — 3:42
          </div>
          {/* waveform mock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 40 }}>
            {Array.from({ length: 56 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: `${20 + Math.sin(i * 0.6) * 12 + (i % 5) * 3}px`,
                  background: i < 22 ? W.accent : W.ink2,
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
          <Anno>fragments · 3</Anno>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ width: 14, height: 14, border: `1px solid ${W.ink2}`, borderRadius: 3 }} />
              <Scribble w="long" thin />
            </div>
          ))}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
            <Btn>transcribe</Btn>
            <Btn>link song</Btn>
          </div>
        </div>

        <Note style={{ position: 'absolute', left: 30, bottom: 30, transform: 'rotate(-3deg)' }}>
          drop in / paste<br />any sketch here.<br />claude can read it.
        </Note>
      </div>

      {/* Chat rail */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderLeft: `1.5px solid ${W.ink}`,
          background: W.paper,
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px dashed ${W.ink2}`,
          }}
        >
          <span className="wf-sketch" style={{ fontSize: 17, fontWeight: 700 }}>
            ✦ co-pilot
          </span>
          <Anno>vein context loaded</Anno>
        </div>

        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          <div className="wf-box-soft" style={{ padding: 10, fontSize: 11.5 }}>
            <Anno style={{ marginBottom: 4 }}>// you</Anno>
            transcribe button feels lost in the bottom row. options?
          </div>
          <div
            style={{
              padding: 10,
              fontSize: 11.5,
              background: W.paper2,
              borderRadius: 6,
              borderLeft: `2px solid ${W.accent}`,
            }}
          >
            <Anno style={{ marginBottom: 4 }}>// claude</Anno>
            three quick takes —
            <TextLines count={4} widths={['long', 'long', 'med', 'long']} thin style={{ marginTop: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Btn>option A</Btn>
              <Btn>option B</Btn>
              <Btn>option C</Btn>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 10,
            borderTop: `1px dashed ${W.ink2}`,
            display: 'flex',
            gap: 6,
          }}
        >
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
            ask, sketch, paste…
          </div>
          <Btn accent>↑</Btn>
        </div>
      </div>
    </div>
  </Frame>
);

// ─── Direction B: Doc (long-scroll, notion-style) ────────────────
// One long document per product. Sections for brief, decisions, current
// task, roadmap, analytics, support. Linear, narrative.

const WorkspaceB = () => (
  <Frame label="hub.taliaduvet.com/vein/doc">
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        height: '100%',
      }}
    >
      {/* TOC sidebar */}
      <div
        style={{
          background: W.paper2,
          borderRight: `1px solid ${W.ink2}`,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <Anno>← products</Anno>
        <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
          Vein
        </div>
        <Pill variant="live" style={{ alignSelf: 'flex-start' }}>live · v1.3</Pill>

        <Anno style={{ marginTop: 14 }}>// contents</Anno>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['◐', 'brief & vision'],
            ['●', 'design decisions', true],
            ['○', 'current sprint'],
            ['○', 'roadmap'],
            ['○', 'analytics'],
            ['○', 'support log'],
            ['○', 'marketing'],
          ].map(([icon, t, active]) => (
            <div
              key={t}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 12,
                color: active ? W.ink : W.ink2,
                fontWeight: active ? 600 : 400,
              }}
            >
              <span>{icon}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Anno>last edited · 14m ago</Anno>
        </div>
      </div>

      {/* Doc body */}
      <div style={{ padding: '24px 40px', overflow: 'auto' }}>
        {/* Section: brief */}
        <Anno>// brief & vision</Anno>
        <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>
          voice-memo catalog for solo artists
        </div>
        <TextLines count={3} style={{ marginTop: 10 }} />

        {/* Section: design decisions */}
        <div style={{ marginTop: 24 }}>
          <Anno>// design decisions</Anno>
          <div
            className="wf-sketch"
            style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 8 }}
          >
            transcribe button placement
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['A', 'B', 'C'].map((k, i) => (
              <div
                key={k}
                className="wf-box"
                style={{
                  padding: 8,
                  ...(i === 1 ? { background: W.paper2, boxShadow: `0 0 0 2px ${W.accent}` } : {}),
                }}
              >
                <ImgPlaceholder style={{ height: 80 }}>option {k}</ImgPlaceholder>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <Anno>option {k}</Anno>
                  {i === 1 && <Pill variant="accent">chosen</Pill>}
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
              fontSize: 12,
            }}
          >
            <Anno style={{ marginBottom: 4 }}>// rationale — paired w/ claude · may 21</Anno>
            B keeps transcribe in muscle-memory zone while pushing 'link song'
            below the fold. tracks with how users actually used v1.2 (analytics ↓).
          </div>
        </div>

        {/* Section: sprint */}
        <div style={{ marginTop: 24 }}>
          <Anno>// current sprint · v1.4</Anno>
          <div className="wf-box" style={{ padding: 12, marginTop: 6 }}>
            {[
              ['✓', 'iOS safe blob playback', '#5a7a4e'],
              ['▸', 'fragment transcribe retry', W.accent2],
              ['○', 'tag manager v2', W.muted],
              ['○', 'home-screen shortcut copy', W.muted],
            ].map(([icon, t, c], i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 12.5,
                  padding: '4px 0',
                  borderBottom: i < 3 ? `1px dashed ${W.paper2}` : 'none',
                }}
              >
                <span style={{ color: c, fontWeight: 700, width: 12 }}>{icon}</span>
                <span style={{ flex: 1, color: i === 1 ? W.ink : W.ink2 }}>{t}</span>
                <Anno>{['8m','—','—','—'][i]}</Anno>
              </div>
            ))}
          </div>
        </div>

        {/* mini analytics teaser */}
        <div style={{ marginTop: 24 }}>
          <Anno>// analytics · last 30d</Anno>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6 }}>
            {[['users','142'],['memos','1.2k'],['retention','41%'],['mrr','$0']].map(([l,v])=>(
              <div key={l} className="wf-box-soft" style={{ padding: 8 }}>
                <Anno>{l}</Anno>
                <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <Note style={{ position: 'absolute', right: 30, top: 20, transform: 'rotate(2deg)' }}>
      one doc per product —<br />living spec ⟷ claude chat<br />in a side drawer (toggle)
    </Note>
  </Frame>
);

// ─── Direction C: Tabs over canvas ───────────────────────────────
// Heavy emphasis on the current "mode" — Design / Roadmap / Analytics /
// Support / Marketing — each is a full-canvas workspace.

const WorkspaceC = () => (
  <Frame label="hub.taliaduvet.com/vein">
    {/* Brand bar */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 22px',
        background: W.ink,
        color: W.paper,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Anno style={{ color: W.paper2 }}>← hub</Anno>
        <span className="wf-sketch" style={{ fontSize: 20, fontWeight: 700, color: W.paper }}>
          Vein
        </span>
        <span className="wf-mono" style={{ fontSize: 10, color: W.paper2 }}>v1.3 · live</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span className="wf-mono" style={{ fontSize: 10, color: W.paper2 }}>preview ↗</span>
        <span className="wf-mono" style={{ fontSize: 10, color: W.accent }}>publish</span>
      </div>
    </div>

    {/* Big tabs */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        borderBottom: `1.5px solid ${W.ink}`,
      }}
    >
      {[
        ['Design',    true,  '14 artboards'],
        ['Roadmap',   false, '7 items'],
        ['Analytics', false, '142 users'],
        ['Support',   false, '3 open'],
        ['Marketing', false, 'next: jun 6'],
      ].map(([t, active, sub], i) => (
        <div
          key={t}
          style={{
            padding: '10px 14px',
            borderRight: i < 4 ? `1px solid ${W.ink2}` : 'none',
            background: active ? W.paper2 : W.paper,
            borderBottom: active ? `3px solid ${W.accent}` : '3px solid transparent',
          }}
        >
          <div className="wf-sketch" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
            {t}
          </div>
          <Anno style={{ marginTop: 2 }}>{sub}</Anno>
        </div>
      ))}
    </div>

    {/* Canvas: Design mode */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100% - 96px)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 22px',
          borderBottom: `1px dashed ${W.ink2}`,
          background: W.paper2,
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Anno>section · memo screen</Anno>
          <Anno>·</Anno>
          <Anno>3 of 14 artboards</Anno>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn>+ artboard</Btn>
          <Btn accent>open w/ claude</Btn>
        </div>
      </div>

      <div style={{ flex: 1, padding: 18, display: 'flex', gap: 14, overflow: 'auto', background: W.paper2 }}>
        {/* artboards */}
        {['A · current', 'B · proposed', 'C · alt'].map((label, i) => (
          <div
            key={label}
            className="wf-box"
            style={{
              flex: 1,
              minWidth: 180,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transform: `rotate(${i % 2 ? 0.6 : -0.4}deg)`,
              background: W.paper,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Anno>{label}</Anno>
              {i === 1 && <Pill variant="accent">chosen</Pill>}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Scribble w="med" />
              <Scribble w="long" thin />
              <ImgPlaceholder style={{ height: 60 }}>waveform</ImgPlaceholder>
              <Scribble w="short" thin />
              <Scribble w="long" thin />
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                <Btn style={{ fontSize: 9, padding: '4px 8px' }}>btn</Btn>
                <Btn style={{ fontSize: 9, padding: '4px 8px' }}>btn</Btn>
              </div>
            </div>
          </div>
        ))}

        {/* "+ new" placeholder */}
        <div
          className="wf-box-dashed"
          style={{
            flex: '0 0 100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: W.muted,
            fontFamily: W.sketch,
            fontSize: 18,
          }}
        >
          + new
        </div>
      </div>
    </div>

    <Note
      style={{ position: 'absolute', right: 30, bottom: 24, transform: 'rotate(-3deg)' }}
    >
      claude lives in a<br />floating panel (⌘k)<br />— not a fixed rail.
    </Note>
  </Frame>
);

Object.assign(window, { WorkspaceA, WorkspaceB, WorkspaceC });
