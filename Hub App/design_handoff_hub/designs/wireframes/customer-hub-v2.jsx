// v2 refined directions — picks: hub=A, admin=A+B merged, ws=B
// Building richer wireframes that incorporate pricing intrigue,
// today-focus + command-bridge density, and toggleable copilot drawer.

// ─── HUB A v2 · Constellation w/ context + pricing ─────────────────
// Constellation hero on top — products as stars with thin
// drop-lines connecting to detailed cards below. Pricing visible.

const CustomerHubAv2 = () => {
  const products = [
    {
      name: 'Vein',
      tag: 'a voice-memo vault for solo artists',
      phase: 'Phase I · Isolation',
      status: 'live',
      what:
        'Record or import audio, mark fragments, transcribe with Whisper, link ideas to songs.',
      who: 'for the 3am idea you forget by morning.',
      bullets: ['waveform fragments', 'Whisper transcribe', 'Drive vault sync', 'PWA · offline'],
      price: '$24 once',
      r2o: 'or $5/mo × 5 → owned',
      cta: 'try free',
      starX: '14%',
      cardCol: 0,
      filled: true,
    },
    {
      name: 'Ledger',
      tag: 'sole-prop accounting (canada)',
      phase: 'Phase II · Agency',
      status: 'beta',
      what:
        'CRA T2125-aligned income & expenses, multi-user, GST handled, Wealthsimple-friendly.',
      who: 'for taking the wheel back from a shoebox of receipts.',
      bullets: ['T2125 categories', 'GST rates', 'CSV import', 'Receipt storage'],
      price: '$34 once',
      r2o: 'or $7/mo × 5 → owned',
      cta: 'join beta',
      starX: '50%',
      cardCol: 1,
      filled: false,
    },
    {
      name: 'Production',
      tag: 'a co-producer in your pocket',
      phase: 'Phase III · Denial',
      status: 'soon',
      what:
        'Decision support for production choices and techniques — built around how you actually work.',
      who: 'for when you can\u2019t tell if the kick is the problem.',
      bullets: ['decision prompts', 'reference library', 'session notes', 'mentor mode'],
      price: 'pricing soon',
      r2o: 'early-access pricing for waitlist',
      cta: 'join waitlist',
      starX: '86%',
      cardCol: 2,
      filled: false,
    },
  ];

  return (
    <Frame label="taliaduvet.com/tools">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 28px',
          borderBottom: `1px dashed ${W.ink2}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="wf-sketch" style={{ fontSize: 26, fontWeight: 700 }}>
            talia duvet
          </span>
          <Anno>tools · music · cycles</Anno>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {['music', 'cycles', 'about'].map(l => <Anno key={l}>{l}</Anno>)}
          <Btn>sign in</Btn>
        </div>
      </div>

      {/* Cosmic hero w/ constellation */}
      <div style={{ position: 'relative', padding: '24px 40px 0', height: 270 }}>
        {/* stars */}
        {[
          [60, 30], [140, 80], [220, 25], [310, 110], [400, 50],
          [490, 100], [580, 35], [680, 95], [770, 45], [860, 110],
          [80, 180], [200, 200], [340, 220], [480, 190], [620, 210], [770, 200], [900, 175],
        ].map(([x, y], i) => (
          <Star key={i} x={x} y={y} size={i % 4 === 0 ? 4 : 2} opacity={0.55} />
        ))}

        {/* Hero text */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, marginBottom: 18 }}>
          <Anno>── tools from a working artist ──</Anno>
          <div
            className="wf-sketch"
            style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.02, marginTop: 4 }}
          >
            healing isn't a straight line.<br />
            <span style={{ color: W.accent2 }}>neither is making things.</span>
          </div>
          <div
            className="wf-sketch"
            style={{ fontSize: 16, color: W.muted, marginTop: 8, fontWeight: 500 }}
          >
            built between songs · one-time purchase · rent-to-own if money's tight
          </div>
        </div>

        {/* Connecting lines from stars to cards (SVG) */}
        <svg
          width="100%"
          height="100"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
        >
          {products.map((p, i) => {
            const x = ['14%', '50%', '86%'][i];
            const cx = ['16.7%', '50%', '83.3%'][i];
            return (
              <line
                key={p.name}
                x1={x} y1="20" x2={cx} y2="100"
                stroke={W.ink2}
                strokeDasharray="3 4"
                strokeWidth="1"
                opacity="0.6"
              />
            );
          })}
        </svg>

        {/* Product stars */}
        {products.map(p => (
          <div
            key={p.name}
            style={{
              position: 'absolute',
              left: p.starX,
              top: 170,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: p.filled ? W.accent : W.paper,
                border: `2px solid ${W.ink}`,
                boxShadow: p.filled
                  ? `0 0 0 5px ${W.paper}, 0 0 0 6px ${W.accent}`
                  : `0 0 0 5px ${W.paper}, 0 0 0 6px ${W.ink2}`,
              }}
            />
            <Anno style={{ marginTop: 2 }}>{p.phase}</Anno>
          </div>
        ))}
      </div>

      {/* Product cards row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          padding: '8px 32px 24px',
        }}
      >
        {products.map(p => (
          <div
            key={p.name}
            className="wf-box"
            style={{
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: p.filled ? W.paper2 : W.paper,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="wf-sketch" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                {p.name}
              </div>
              <Pill variant={p.status}>{p.status}</Pill>
            </div>
            <Anno style={{ textTransform: 'none', color: W.ink2, fontStyle: 'italic' }}>
              {p.tag}
            </Anno>

            <div style={{ fontSize: 12.5, color: W.ink2, lineHeight: 1.35, marginTop: 2 }}>
              {p.what}
            </div>

            <div
              className="wf-sketch"
              style={{ fontSize: 16, color: W.accent2, lineHeight: 1.15 }}
            >
              {p.who}
            </div>

            {/* feature dots */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginTop: 2 }}>
              {p.bullets.map(b => (
                <div key={b} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                  <span style={{ width: 4, height: 4, borderRadius: 2, background: W.accent }} />
                  <span style={{ color: W.ink2 }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Pricing block */}
            <div
              className="wf-box-soft"
              style={{
                marginTop: 'auto',
                padding: '8px 10px',
                background: W.paper,
                borderColor: W.ink2,
              }}
            >
              <Anno>// pricing</Anno>
              <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                {p.price}
              </div>
              <Anno style={{ textTransform: 'none', color: W.ink2 }}>{p.r2o}</Anno>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <Btn accent>{p.cta}</Btn>
              <Btn>read more</Btn>
            </div>
          </div>
        ))}
      </div>

      <Note style={{ position: 'absolute', right: 28, top: 78, transform: 'rotate(-4deg)' }}>
        stars stay magic ✦<br />cards do the<br />heavy lifting ↓
      </Note>
    </Frame>
  );
};

// ─── HUB A v2-alt · Constellation w/ inline expand ─────────────────
// Same cosmic field BUT one product is "selected" and its card
// blooms inside the field — others stay as small stars w/ teaser.

const CustomerHubAv2Alt = () => (
  <Frame label="taliaduvet.com/tools — interactive">
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 28px',
        borderBottom: `1px dashed ${W.ink2}`,
      }}
    >
      <span className="wf-sketch" style={{ fontSize: 24, fontWeight: 700 }}>
        talia duvet · tools
      </span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Anno>music · cycles · about</Anno>
        <Btn>sign in</Btn>
      </div>
    </div>

    {/* Manifesto strip */}
    <div style={{ padding: '18px 32px 8px', textAlign: 'center' }}>
      <div className="wf-sketch" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
        healing isn't a straight line.
      </div>
      <Anno style={{ marginTop: 4 }}>3 tools · one-time + rent-to-own · built by an artist</Anno>
    </div>

    {/* Cosmic field */}
    <div style={{ position: 'relative', flex: 1, padding: '14px 32px' }}>
      {/* stars */}
      {Array.from({ length: 24 }).map((_, i) => (
        <Star
          key={i}
          x={(i * 53) % 880 + 30}
          y={(i * 37) % 360 + 10}
          size={i % 4 === 0 ? 4 : 2}
          opacity={0.55}
        />
      ))}

      {/* Selected: Vein — expanded inline */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 8,
          transform: 'translateX(-50%)',
          width: 380,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: W.accent, border: `2px solid ${W.ink}`,
              boxShadow: `0 0 0 8px ${W.paper}, 0 0 0 9px ${W.accent}, 0 0 0 16px ${W.paper}`,
            }}
          />
          <Anno>Phase I · Isolation</Anno>
        </div>

        <div className="wf-box" style={{ marginTop: 14, padding: 16, background: W.paper2 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <div className="wf-sketch" style={{ fontSize: 32, fontWeight: 700, lineHeight: 0.95 }}>
              Vein
            </div>
            <Pill variant="live">live</Pill>
          </div>
          <Anno style={{ textTransform: 'none', fontStyle: 'italic', marginTop: 2 }}>
            voice-memo vault for solo artists
          </Anno>
          <div className="wf-sketch" style={{ fontSize: 18, color: W.accent2, marginTop: 8, lineHeight: 1.15 }}>
            for the 3am idea you forget by morning.
          </div>
          <div style={{ fontSize: 12.5, color: W.ink2, lineHeight: 1.4, marginTop: 6 }}>
            Record or import audio, mark fragments, transcribe with Whisper,
            link ideas to songs, export your lineage. Works offline.
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: 12,
              gap: 10,
            }}
          >
            <div>
              <Anno>// pricing</Anno>
              <div className="wf-sketch" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                $24 once
              </div>
              <Anno style={{ textTransform: 'none' }}>or $5/mo × 5 → owned</Anno>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn>preview</Btn>
              <Btn accent>try free</Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Other products — small stars w/ teaser */}
      {[
        { name: 'Ledger', x: '12%', y: 110, phase: 'II · Agency', price: '$34 once', status: 'beta' },
        { name: 'Production', x: '88%', y: 100, phase: 'III · Denial', price: 'soon', status: 'soon' },
      ].map(p => (
        <div
          key={p.name}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            opacity: 0.85,
          }}
        >
          <div
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: W.paper, border: `2px solid ${W.ink}`,
              boxShadow: `0 0 0 4px ${W.paper}, 0 0 0 5px ${W.ink2}`,
            }}
          />
          <Anno>{p.phase}</Anno>
          <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
            {p.name}
          </div>
          <Pill variant={p.status}>{p.status}</Pill>
          <Anno style={{ marginTop: 2 }}>{p.price}</Anno>
        </div>
      ))}

      {/* Bottom hint */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 12,
          textAlign: 'center',
        }}
      >
        <Anno>← prev star  · · ·  next star →</Anno>
      </div>

      <Note style={{ position: 'absolute', left: 30, top: 26, transform: 'rotate(-4deg)' }}>
        click a star /<br />swipe ↔ to cycle<br />through phases
      </Note>
    </div>
  </Frame>
);

window.CustomerHubAv2 = CustomerHubAv2;
window.CustomerHubAv2Alt = CustomerHubAv2Alt;
