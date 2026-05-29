// Personal admin dashboard — 3 distinct directions
// Signed-in Talia view. Priorities: dev notes (status/roadmap/TODO),
// analytics, support inbox, marketing/launch scheduling.

// ─── Direction A: Command Bridge ─────────────────────────────────
// Dense overview. Top KPI strip, products column, support col, calendar col.

const AdminA = () => {
  const products = [
    { name: 'Vein', status: 'live', users: '142', mrr: '$0', open: 3, build: 'v1.4 — fragment polish' },
    { name: 'Ledger', status: 'beta', users: '18', mrr: '$0', open: 1, build: 'csv import bug' },
    { name: 'Production', status: 'soon', users: '—', mrr: '—', open: 0, build: 'concept → wires' },
  ];
  return (
    <Frame label="hub.taliaduvet.com/admin" >
      {/* Top bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>
            command bridge
          </span>
          <Anno>logged in as talia · wed may 21</Anno>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn>+ new product</Btn>
          <Btn accent>publish update</Btn>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10,
          padding: '12px 22px',
          borderBottom: `1px dashed ${W.ink2}`,
        }}
      >
        {[
          ['active users', '160'],
          ['mrr', '$0'],
          ['support open', '4'],
          ['shipped this wk', '3'],
          ['next launch', 'jun 14'],
        ].map(([l, v]) => (
          <div key={l} className="wf-box-soft" style={{ padding: '8px 10px' }}>
            <Anno>{l}</Anno>
            <div className="wf-sketch" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* 3-col body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 14, padding: 16, flex: 1 }}>
        {/* Products */}
        <div>
          <Anno style={{ marginBottom: 8 }}>// products</Anno>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {products.map(p => (
              <div key={p.name} className="wf-box" style={{ padding: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                    <Pill variant={p.status}>{p.status}</Pill>
                  </div>
                  <span className="wf-mono" style={{ fontSize: 10, color: W.muted }}>
                    open →
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  {[
                    ['users', p.users],
                    ['mrr', p.mrr],
                    ['open', String(p.open)],
                    ['7-day Δ', '+8%'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <Anno style={{ fontSize: 8.5 }}>{l}</Anno>
                      <span style={{ fontFamily: W.mono, fontSize: 13, fontWeight: 500 }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="wf-mono"
                  style={{ fontSize: 10.5, color: W.ink2, padding: '4px 6px', background: W.paper2, borderRadius: 3 }}
                >
                  ▸ {p.build}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div>
          <Anno style={{ marginBottom: 8 }}>// support inbox · 4</Anno>
          <div className="wf-box" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { from: 'jamie@…', subj: 'fragment won\u2019t transcribe', prod: 'vein', age: '2h' },
              { from: 'priya@…', subj: 'gst rate for ontario?', prod: 'ledger', age: '5h' },
              { from: 'sam@…', subj: 'feature request: tags', prod: 'vein', age: '1d' },
              { from: 'el@…', subj: 'refund — moved to PC', prod: 'vein', age: '2d' },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  borderBottom: i < 3 ? `1px solid ${W.paper2}` : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span className="wf-mono" style={{ fontSize: 10, fontWeight: 500 }}>
                    {m.from}
                  </span>
                  <Anno>{m.age}</Anno>
                </div>
                <div style={{ fontSize: 12, marginBottom: 3 }}>{m.subj}</div>
                <Pill style={{ fontSize: 8.5, padding: '1px 6px' }}>{m.prod}</Pill>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div>
          <Anno style={{ marginBottom: 8 }}>// launch calendar · jun</Anno>
          <div className="wf-box" style={{ padding: 10 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2,
                marginBottom: 6,
              }}
            >
              {['m','t','w','t','f','s','s'].map((d, i) => (
                <Anno key={i} style={{ textAlign: 'center' }}>{d}</Anno>
              ))}
              {Array.from({ length: 28 }).map((_, i) => {
                const events = { 6: 'V', 13: 'L', 14: '★', 21: 'P' };
                const e = events[i];
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      border: `1px solid ${W.paper2}`,
                      borderRadius: 3,
                      fontFamily: W.mono,
                      fontSize: 9,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: e ? W.accent : 'transparent',
                      color: e ? 'white' : W.ink2,
                      fontWeight: e ? 700 : 400,
                    }}
                  >
                    {i + 1}
                    {e && <span style={{ fontSize: 9 }}>{e}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {[
                ['jun 6', 'vein v1.4 ship'],
                ['jun 13–14', 'ledger public beta'],
                ['jun 21', 'production teaser'],
              ].map(([d, t]) => (
                <div key={d} style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                  <span className="wf-mono" style={{ color: W.muted, minWidth: 60 }}>{d}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Note style={{ position: 'absolute', right: 16, top: 76, transform: 'rotate(2deg)' }}>
        dense! → mobile becomes<br />tabs (products/inbox/cal)
      </Note>
    </Frame>
  );
};

// ─── Direction B: Today view ─────────────────────────────────────
// Focus mode. "What needs you today" hero, then collapsed products.

const AdminB = () => (
  <Frame label="hub.taliaduvet.com">
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 32px',
        borderBottom: `1px dashed ${W.ink2}`,
      }}
    >
      <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>
        morning, talia ☾
      </span>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Anno>today · week · everything</Anno>
        <Btn>switch to public view</Btn>
      </div>
    </div>

    <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
      {/* Today list */}
      <div>
        <div style={{ marginBottom: 18 }}>
          <Anno>// 3 things, today</Anno>
          <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
            just three. don't drift.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              num: '01',
              prod: 'vein',
              title: 'ship fragment-transcribe retry',
              sub: 'blocks 2 support tickets · 30 min',
              state: 'design',
            },
            {
              num: '02',
              prod: 'ledger',
              title: 'finalize gst row layout',
              sub: 'priya replied with screenshot · paired w/ claude',
              state: 'in progress',
            },
            {
              num: '03',
              prod: 'production',
              title: 'concept artboards review',
              sub: '4 wireframes waiting for sign-off',
              state: 'review',
            },
          ].map(t => (
            <div key={t.num} className="wf-box" style={{ padding: 14, display: 'flex', gap: 14 }}>
              <div
                className="wf-sketch"
                style={{ fontSize: 32, fontWeight: 700, color: W.accent2, lineHeight: 1 }}
              >
                {t.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                  <Pill>{t.prod}</Pill>
                  <Anno>{t.state}</Anno>
                </div>
                <div style={{ fontFamily: W.sans, fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
                  {t.title}
                </div>
                <Anno style={{ textTransform: 'none' }}>{t.sub}</Anno>
              </div>
              <Btn accent>open</Btn>
            </div>
          ))}
        </div>

        <div
          className="wf-box-dashed"
          style={{ marginTop: 14, padding: 10, display: 'flex', justifyContent: 'space-between' }}
        >
          <Anno>+ later this week · 6 items</Anno>
          <span className="wf-mono" style={{ fontSize: 11, color: W.muted }}>expand →</span>
        </div>
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="wf-box-soft" style={{ padding: 12 }}>
          <Anno style={{ marginBottom: 6 }}>// pulse · 7 days</Anno>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="wf-sketch" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              160
            </div>
            <span className="wf-mono" style={{ fontSize: 10, color: '#5a7a4e' }}>
              ↑ +14
            </span>
          </div>
          <Anno style={{ textTransform: 'none' }}>active across all tools</Anno>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-end',
              height: 38,
            }}
          >
            {[12, 18, 14, 22, 26, 20, 28].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: W.ink2,
                  borderRadius: '2px 2px 0 0',
                  height: `${(h / 28) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="wf-box-soft" style={{ padding: 12 }}>
          <Anno style={{ marginBottom: 6 }}>// inbox · 4 open</Anno>
          {[
            ['vein', 'jamie · transcribe fail'],
            ['ledger', 'priya · gst rate'],
            ['vein', 'sam · feature: tags'],
          ].map(([p, t], i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                padding: '6px 0',
                borderBottom: i < 2 ? `1px solid ${W.paper2}` : 'none',
                fontSize: 12,
              }}
            >
              <Pill style={{ fontSize: 8.5, padding: '1px 6px' }}>{p}</Pill>
              <span>{t}</span>
            </div>
          ))}
        </div>

        <div className="wf-box-soft" style={{ padding: 12 }}>
          <Anno style={{ marginBottom: 6 }}>// next launch</Anno>
          <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
            ledger public<br />beta · jun 13
          </div>
          <Anno style={{ textTransform: 'none', marginTop: 4 }}>23 days · 4 blockers</Anno>
        </div>
      </div>
    </div>

    <Note
      style={{ position: 'absolute', left: 360, top: 110, transform: 'rotate(-2deg)' }}
    >
      pmdd-friendly:<br />only 3 today.
    </Note>
  </Frame>
);

// ─── Direction C: Mission Control / Orbit ────────────────────────
// Products as orbiting bodies around a central "you". Hover/click expands
// the right rail. More playful, more cosmic.

const AdminC = () => (
  <Frame label="hub.taliaduvet.com — orbit">
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: `1px solid ${W.ink2}`,
        background: W.paper2,
      }}
    >
      <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>
        mission control
      </span>
      <div style={{ display: 'flex', gap: 12 }}>
        <Anno>orbit · grid · list</Anno>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', height: 'calc(100% - 50px)' }}>
      {/* Orbit canvas */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRight: `1px dashed ${W.ink2}` }}>
        {/* sparse stars */}
        {[[40,40],[120,300],[480,60],[510,340],[80,200],[420,200]].map(([x,y],i)=>(
          <Star key={i} x={x} y={y} size={2.5} opacity={0.5} />
        ))}

        {/* orbit rings */}
        {[120, 180, 250].map(r => (
          <div
            key={r}
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: r * 2, height: r * 2,
              border: `1px dashed ${W.ink2}`,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.5,
            }}
          />
        ))}

        {/* center: you */}
        <div
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: W.accent,
              border: `2px solid ${W.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: W.sketch,
              fontWeight: 700,
              fontSize: 26,
              color: 'white',
            }}
          >
            t
          </div>
          <Anno>you</Anno>
        </div>

        {/* orbiters */}
        {[
          { name: 'Vein',       sub: 'live · 142 users',   angle: -60, r: 120, size: 38, fill: true },
          { name: 'Ledger',     sub: 'beta · 18 users',    angle:  40, r: 180, size: 34, fill: false },
          { name: 'Production', sub: 'soon',               angle: 140, r: 250, size: 30, fill: false },
          { name: '?',          sub: 'phase iv slot',      angle: 220, r: 250, size: 24, fill: false, dashed: true },
        ].map(o => {
          const rad = (o.angle * Math.PI) / 180;
          const cx = Math.cos(rad) * o.r;
          const cy = Math.sin(rad) * o.r;
          return (
            <div
              key={o.name}
              style={{
                position: 'absolute',
                left: `calc(50% + ${cx}px)`,
                top: `calc(50% + ${cy}px)`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: o.size, height: o.size,
                  borderRadius: '50%',
                  background: o.fill ? W.ink : W.paper,
                  border: `${o.dashed ? '1.5px dashed' : '2px solid'} ${W.ink}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: o.fill ? 'white' : W.ink,
                  fontFamily: W.sans,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {o.name[0]}
              </div>
              <div className="wf-sketch" style={{ fontSize: 16, fontWeight: 700 }}>
                {o.name}
              </div>
              <Anno style={{ fontSize: 8.5 }}>{o.sub}</Anno>
            </div>
          );
        })}

        <Note
          style={{ position: 'absolute', left: 12, bottom: 12, transform: 'rotate(-3deg)' }}
        >
          click a planet →<br />detail in side panel
        </Note>
      </div>

      {/* Side panel */}
      <div style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div>
          <Anno>// selected · vein</Anno>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginTop: 4,
            }}
          >
            <span style={{ fontFamily: W.sans, fontWeight: 700, fontSize: 22 }}>Vein</span>
            <Pill variant="live">live</Pill>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {[
            ['users', '142'],
            ['7d Δ', '+12%'],
            ['mrr', '$0'],
            ['open tix', '3'],
          ].map(([l, v]) => (
            <div key={l} className="wf-box-soft" style={{ padding: '6px 10px' }}>
              <Anno style={{ fontSize: 8.5 }}>{l}</Anno>
              <span style={{ fontFamily: W.mono, fontSize: 16, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        <div>
          <Anno style={{ marginBottom: 4 }}>// build · v1.4</Anno>
          <div className="wf-box-soft" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['✓', 'iOS safe blob playback', '#5a7a4e'],
              ['▸', 'fragment transcribe retry', W.accent2],
              ['○', 'tag manager v2', W.muted],
            ].map(([icon, t, c], i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: c, fontWeight: 700 }}>{icon}</span>
                <span style={{ color: i === 1 ? W.ink : W.ink2 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Anno style={{ marginBottom: 4 }}>// inbox · 3</Anno>
          <div className="wf-box-soft" style={{ padding: 8, fontSize: 11.5 }}>
            <div style={{ borderBottom: `1px solid ${W.paper2}`, paddingBottom: 4, marginBottom: 4 }}>
              jamie · transcribe fail · 2h
            </div>
            <div style={{ borderBottom: `1px solid ${W.paper2}`, paddingBottom: 4, marginBottom: 4 }}>
              sam · feature: tags · 1d
            </div>
            <div>el · refund req · 2d</div>
          </div>
        </div>

        <Btn accent style={{ alignSelf: 'flex-start' }}>open workspace →</Btn>
      </div>
    </div>
  </Frame>
);

Object.assign(window, { AdminA, AdminB, AdminC });
