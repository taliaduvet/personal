// Customer-facing hub homepage — 3 distinct directions
// All public/landing view. Aud: indie musicians, neurodivergent creatives,
// underrepresented creators. Products: Vein (live), Ledger (beta),
// "Production" tool (soon), plus future slots.

// ─── Direction A: Constellation / Star Map ───────────────────────
// Vast cosmic field; products are labeled "stars" the visitor discovers.
// Narrative-led. Hover to surface card details.

const CustomerHubA = () => (
  <Frame label="taliaduvet.com — tools">
    {/* Header */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 28px',
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
        <Anno>music</Anno>
        <Anno>about</Anno>
        <Anno>tools</Anno>
        <Btn>sign in</Btn>
      </div>
    </div>

    {/* Cosmic field */}
    <div style={{ position: 'relative', height: 360, padding: '32px 40px' }}>
      {/* sprinkled stars */}
      {[
        [60, 40], [120, 90], [200, 30], [280, 130], [350, 60],
        [430, 110], [510, 40], [600, 150], [680, 80], [760, 50],
        [820, 130], [100, 220], [220, 280], [340, 250], [460, 310],
        [580, 270], [700, 220], [800, 290], [880, 180], [40, 290],
      ].map(([x, y], i) => (
        <Star key={i} x={x} y={y} size={i % 3 === 0 ? 4 : 2} opacity={0.6} />
      ))}

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          className="wf-sketch"
          style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.05, marginBottom: 10 }}
        >
          tools from a working artist.
        </div>
        <div
          className="wf-sketch"
          style={{ fontSize: 22, color: W.muted, fontWeight: 500 }}
        >
          built because i needed them. shared because you might too.
        </div>
      </div>

      {/* Product "stars" with labels */}
      {[
        { x: 150, y: 200, label: 'Vein', sub: 'voice memo vault', status: 'live' },
        { x: 460, y: 180, label: 'Ledger', sub: 'sole-prop accounting', status: 'beta' },
        { x: 740, y: 230, label: 'Production', sub: 'decisions & techniques', status: 'soon' },
      ].map((p, i) => (
        <div
          key={p.label}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: p.status === 'live' ? W.accent : W.paper,
              border: `2px solid ${W.ink}`,
              boxShadow: `0 0 0 6px ${W.paper}, 0 0 0 7px ${W.ink2}`,
            }}
          />
          <Anno>{p.sub}</Anno>
          <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>
            {p.label}
          </div>
          <Pill variant={p.status}>{p.status}</Pill>
        </div>
      ))}

      {/* Annotation */}
      <Note style={{ position: 'absolute', right: 30, top: 30, transform: 'rotate(-4deg)' }}>
        hover a star <br />
        → product card slides in ↘
      </Note>
    </div>

    {/* Founder note + manifesto */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 28,
        padding: '24px 40px',
        borderTop: `1.2px dashed ${W.ink2}`,
      }}
    >
      <div>
        <Anno style={{ marginBottom: 8 }}>// a message from talia</Anno>
        <div className="wf-sketch" style={{ fontSize: 19, lineHeight: 1.3 }}>
          we live in a world designed to make you feel like you're the problem.
          these tools are the opposite of that — built for the way artists
          actually work, not the way the industry wants us to.
        </div>
      </div>
      <div>
        <Anno style={{ marginBottom: 8 }}>// elsewhere</Anno>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['taliaduvet.com — music + cycles', 'instagram', 'spotify', 'press kit'].map(l => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 1.5, background: W.ink2 }} />
              <Anno style={{ textTransform: 'none' }}>{l}</Anno>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

// ─── Direction B: Phases (Cycles-inspired) ────────────────────────
// Four-phase narrative columns echoing the Cycles series.
// Each phase introduces a tool tied to the emotional state it serves.

const CustomerHubB = () => {
  const phases = [
    {
      num: 'I',
      name: 'Isolation',
      sub: 'capture before it disappears',
      tool: 'Vein',
      tag: 'voice memo catalog',
      status: 'live',
      copy: 'for the 3am idea you forget by morning.',
    },
    {
      num: 'II',
      name: 'Loss of Agency',
      sub: 'take the wheel back',
      tool: 'Ledger',
      tag: 'sole-prop accounting',
      status: 'beta',
      copy: 'cra-aligned books that feel like yours.',
    },
    {
      num: 'III',
      name: 'Denial',
      sub: 'choose, don\u2019t drift',
      tool: 'Production',
      tag: 'decisions & techniques',
      status: 'soon',
      copy: 'a co-producer that asks the right question.',
    },
    {
      num: 'IV',
      name: 'Release',
      sub: '\u00a0',
      tool: '—',
      tag: 'something is coming',
      status: 'soon',
      copy: 'reserved for what comes next.',
    },
  ];
  return (
    <Frame label="taliaduvet.com — tools">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 28px',
          borderBottom: `1px solid ${W.ink2}`,
        }}
      >
        <span className="wf-sketch" style={{ fontSize: 24, fontWeight: 700 }}>
          talia duvet · tools
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Anno>cycles</Anno>
          <Anno>music</Anno>
          <Anno>about</Anno>
          <Btn>sign in</Btn>
        </div>
      </div>

      <div style={{ padding: '22px 32px 14px' }}>
        <div className="wf-sketch" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.05 }}>
          healing isn't a straight line.
          <br />
          neither is making things.
        </div>
        <div className="wf-sketch" style={{ fontSize: 18, color: W.muted, marginTop: 6 }}>
          four phases. four tools (eventually). built by an artist with pmdd + adhd, for everyone else still trying.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          padding: '8px 32px 24px',
        }}
      >
        {phases.map((p, i) => (
          <div
            key={p.num}
            className="wf-box"
            style={{
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              minHeight: 280,
              background: i === 0 ? W.paper2 : W.paper,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="wf-mono" style={{ fontSize: 11, color: W.muted }}>
                phase {p.num}
              </span>
              <Pill variant={p.status}>{p.status}</Pill>
            </div>
            <div>
              <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                {p.name}
              </div>
              <Anno style={{ marginTop: 4 }}>{p.sub}</Anno>
            </div>

            <ImgPlaceholder style={{ height: 70, marginTop: 2 }}>
              {p.tool === '—' ? 'tbd cover' : `${p.tool} cover`}
            </ImgPlaceholder>

            <div>
              <div style={{ fontFamily: W.sans, fontWeight: 700, fontSize: 16 }}>
                {p.tool}
              </div>
              <Anno style={{ textTransform: 'none' }}>{p.tag}</Anno>
            </div>

            <div className="wf-sketch" style={{ fontSize: 16, lineHeight: 1.2, color: W.ink2 }}>
              {p.copy}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
              {p.status === 'soon' ? (
                <Btn>notify me</Btn>
              ) : (
                <>
                  <Btn accent>try free</Btn>
                  <Btn>learn more</Btn>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Note
        style={{
          position: 'absolute',
          right: 36,
          bottom: 14,
          transform: 'rotate(-2deg)',
          textAlign: 'right',
        }}
      >
        end of phase iv loops back<br />→ ouroboros nav?
      </Note>
    </Frame>
  );
};

// ─── Direction C: Studio Shelf ────────────────────────────────────
// More utilitarian; hero left with founder context, product grid right.
// Album-spine inspired cards.

const CustomerHubC = () => (
  <Frame label="taliaduvet.com/tools">
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 28px',
        borderBottom: `1.2px solid ${W.ink}`,
        background: W.paper2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 26, height: 26,
            border: `1.8px solid ${W.ink}`,
            borderRadius: '50%',
            background: W.accent,
          }}
        />
        <span style={{ fontFamily: W.sans, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>
          TALIA DUVET / TOOLS
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <Anno>shelf</Anno>
        <Anno>manifesto</Anno>
        <Anno>contact</Anno>
        <Btn>sign in</Btn>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100% - 56px)' }}>
      {/* Left — manifesto column */}
      <div
        style={{
          padding: '28px 24px',
          borderRight: `1.5px solid ${W.ink}`,
          background: W.paper2,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <Anno>— shelf 01 / 2026</Anno>
        <div
          className="wf-sketch"
          style={{ fontSize: 36, fontWeight: 700, lineHeight: 0.95 }}
        >
          made in the studio. shipped from the field.
        </div>
        <div className="wf-sketch" style={{ fontSize: 17, color: W.ink2, lineHeight: 1.25 }}>
          i build these tools between songs. one-time purchase. rent-to-own if money's tight.
          no subscription traps.
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Anno style={{ marginBottom: 8 }}>// also from talia</Anno>
          <div style={{ display: 'grid', gap: 6 }}>
            {['cycles · the series', 'taliaduvet.com', 'press kit'].map(l => (
              <span key={l} className="wf-mono" style={{ fontSize: 10.5, color: W.ink2 }}>
                → {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — product shelf */}
      <div style={{ padding: '24px 28px', overflow: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>
            the shelf
          </span>
          <Anno>3 of 4 · sorted by release</Anno>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { name: 'Vein', tag: 'voice memo catalog for solo artists', status: 'live', price: '$24 once' },
            { name: 'Ledger', tag: 'sole-prop accounting (canada)', status: 'beta', price: 'free in beta' },
            { name: 'Production', tag: 'a co-producer in your pocket', status: 'soon', price: 'tbd' },
          ].map(p => (
            <div key={p.name} className="wf-box" style={{ padding: 12 }}>
              <ImgPlaceholder style={{ aspectRatio: '1 / 1', marginBottom: 10 }}>
                {p.name.toLowerCase()} cover<br />~square art
              </ImgPlaceholder>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: W.sans, fontWeight: 700, fontSize: 16 }}>
                  {p.name}
                </span>
                <Pill variant={p.status}>{p.status}</Pill>
              </div>
              <Anno style={{ textTransform: 'none', marginTop: 4, lineHeight: 1.2 }}>
                {p.tag}
              </Anno>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="wf-mono" style={{ fontSize: 10, color: W.ink2 }}>
                  {p.price}
                </span>
                <Btn accent>
                  {p.status === 'soon' ? 'notify' : p.status === 'beta' ? 'join beta' : 'try free'}
                </Btn>
              </div>
            </div>
          ))}

          {/* future placeholder */}
          <div className="wf-box-dashed" style={{ padding: 12, opacity: 0.7 }}>
            <ImgPlaceholder style={{ aspectRatio: '1 / 1', marginBottom: 10 }}>
              future tool
            </ImgPlaceholder>
            <div style={{ fontFamily: W.sans, fontWeight: 700, fontSize: 16, color: W.muted }}>
              ?
            </div>
            <Anno style={{ textTransform: 'none', marginTop: 4 }}>
              tbd — phase iv
            </Anno>
          </div>
        </div>
      </div>
    </div>

    <Note style={{ position: 'absolute', left: 250, top: 90, transform: 'rotate(-3deg)' }}>
      manifesto LEFT,<br />tools RIGHT —<br />asym hero
    </Note>
  </Frame>
);

Object.assign(window, { CustomerHubA, CustomerHubB, CustomerHubC });
