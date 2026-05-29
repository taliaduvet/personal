// Admin v2 — A+B merged: "today" focus hero on top, command-bridge KPIs
// + inbox + calendar + product strip below. One page, two reading modes:
// quick (just look at the top) or deep (scroll for ops).

const AdminMerged = () => {
  const products = [
    { name: 'Vein',       status: 'live', users: '142', delta: '+12%', open: 3, build: 'v1.4 — fragment polish', pct: 65 },
    { name: 'Ledger',     status: 'beta', users: '18',  delta: '+4',   open: 1, build: 'csv import bug',         pct: 40 },
    { name: 'Production', status: 'soon', users: '—',   delta: '—',    open: 0, build: 'concept → wires',        pct: 15 },
  ];

  return (
    <Frame label="hub.taliaduvet.com/admin" >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 24px',
          borderBottom: `1.2px solid ${W.ink}`,
          background: W.paper2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>
            morning, talia ☾
          </span>
          <Anno>wed may 21 · cycle d12</Anno>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Anno>view · admin / public</Anno>
          <Btn>switch to public</Btn>
          <Btn accent>+ new</Btn>
        </div>
      </div>

      {/* TOP — Today focus */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, padding: '14px 24px 0' }}>
        <div>
          <Anno>// 3 things, today</Anno>
          <div className="wf-sketch" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginBottom: 8 }}>
            just three. don't drift.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { num: '01', prod: 'vein',       title: 'ship fragment-transcribe retry',  sub: 'blocks 2 tickets · 30 min', state: 'design' },
              { num: '02', prod: 'ledger',     title: 'finalize gst row layout',          sub: 'paired w/ claude',          state: 'in progress' },
              { num: '03', prod: 'production', title: 'concept artboards review',         sub: '4 wires waiting',           state: 'review' },
            ].map(t => (
              <div key={t.num} className="wf-box" style={{ padding: 10, display: 'flex', gap: 12 }}>
                <div
                  className="wf-sketch"
                  style={{ fontSize: 28, fontWeight: 700, color: W.accent2, lineHeight: 1, minWidth: 30 }}
                >
                  {t.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <Pill>{t.prod}</Pill>
                    <Anno>{t.state}</Anno>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>{t.title}</div>
                  <Anno style={{ textTransform: 'none' }}>{t.sub}</Anno>
                </div>
                <Btn accent>open</Btn>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail — pulse + next launch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="wf-box-soft" style={{ padding: 10 }}>
            <Anno>// pulse · 7d</Anno>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
                160
              </div>
              <Anno style={{ color: '#5a7a4e', fontSize: 11 }}>↑ +14</Anno>
            </div>
            <Anno style={{ textTransform: 'none' }}>active across all tools</Anno>
            <div style={{ marginTop: 6, display: 'flex', gap: 2, alignItems: 'flex-end', height: 26 }}>
              {[12, 18, 14, 22, 26, 20, 28].map((h, i) => (
                <div key={i} style={{ flex: 1, background: W.ink2, height: `${(h/28)*100}%`, borderRadius: '2px 2px 0 0' }} />
              ))}
            </div>
          </div>
          <div className="wf-box-soft" style={{ padding: 10 }}>
            <Anno>// next launch · 23d</Anno>
            <div className="wf-sketch" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>
              ledger public beta<br />jun 13
            </div>
            <Anno style={{ textTransform: 'none' }}>4 blockers · 6 items left</Anno>
            <div style={{ marginTop: 6, height: 4, background: W.paper2, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: W.accent }} />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          padding: '14px 24px 4px',
          display: 'flex',
          gap: 10,
          alignItems: 'baseline',
        }}
      >
        <span style={{ flex: 1, height: 1, background: W.ink2, opacity: 0.4 }} />
        <Anno>↓ everything else</Anno>
        <span style={{ flex: 1, height: 1, background: W.ink2, opacity: 0.4 }} />
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          padding: '6px 24px 10px',
        }}
      >
        {[
          ['active', '160'],
          ['mrr', '$0'],
          ['support', '4 open'],
          ['shipped (wk)', '3'],
          ['next', 'jun 14'],
        ].map(([l, v]) => (
          <div key={l} className="wf-box-soft" style={{ padding: '6px 10px' }}>
            <Anno style={{ fontSize: 8.5 }}>{l}</Anno>
            <div className="wf-sketch" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* Products + inbox + calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 12, padding: '4px 24px 20px' }}>
        {/* Products column */}
        <div>
          <Anno style={{ marginBottom: 6 }}>// products</Anno>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <div key={p.name} className="wf-box" style={{ padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                    <Pill variant={p.status}>{p.status}</Pill>
                  </div>
                  <Anno>open →</Anno>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 6 }}>
                  {[
                    ['users', p.users],
                    ['7d Δ', p.delta],
                    ['open', String(p.open)],
                    ['progress', `${p.pct}%`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <Anno style={{ fontSize: 8.5 }}>{l}</Anno>
                      <span style={{ fontFamily: W.mono, fontSize: 12 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 6, height: 3, background: W.paper2, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${p.pct}%`, height: '100%', background: W.accent }} />
                </div>
                <div
                  className="wf-mono"
                  style={{ marginTop: 6, fontSize: 10.5, color: W.ink2, padding: '3px 6px', background: W.paper2, borderRadius: 3 }}
                >
                  ▸ {p.build}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div>
          <Anno style={{ marginBottom: 6 }}>// inbox · 4</Anno>
          <div className="wf-box" style={{ padding: 0 }}>
            {[
              { from: 'jamie@…',  subj: 'transcribe fail',      prod: 'vein',   age: '2h' },
              { from: 'priya@…',  subj: 'gst rate ontario?',    prod: 'ledger', age: '5h' },
              { from: 'sam@…',    subj: 'feature: tag groups',  prod: 'vein',   age: '1d' },
              { from: 'el@…',     subj: 'refund — moved to PC', prod: 'vein',   age: '2d' },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  padding: '7px 10px',
                  borderBottom: i < 3 ? `1px solid ${W.paper2}` : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span className="wf-mono" style={{ fontSize: 10 }}>{m.from}</span>
                  <Anno>{m.age}</Anno>
                </div>
                <div style={{ fontSize: 11.5, marginBottom: 2 }}>{m.subj}</div>
                <Pill style={{ fontSize: 8, padding: '1px 6px' }}>{m.prod}</Pill>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div>
          <Anno style={{ marginBottom: 6 }}>// jun · launches</Anno>
          <div className="wf-box" style={{ padding: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {['m','t','w','t','f','s','s'].map((d, i) => (
                <Anno key={i} style={{ textAlign: 'center', fontSize: 8 }}>{d}</Anno>
              ))}
              {Array.from({ length: 28 }).map((_, i) => {
                const events = { 5: 'V', 12: 'L', 13: '★', 20: 'P' };
                const e = events[i];
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      border: `1px solid ${W.paper2}`,
                      borderRadius: 2,
                      fontFamily: W.mono,
                      fontSize: 8,
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
                    {e && <span style={{ fontSize: 7 }}>{e}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
              {[
                ['jun 6',     'vein v1.4'],
                ['jun 13',    'ledger beta ★'],
                ['jun 21',    'production teaser'],
              ].map(([d, t]) => (
                <div key={d} style={{ display: 'flex', gap: 6, fontSize: 10.5 }}>
                  <span className="wf-mono" style={{ color: W.muted, minWidth: 50 }}>{d}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Note style={{ position: 'absolute', right: 30, top: 130, transform: 'rotate(2deg)' }}>
        focus on top.<br />ops below the line.
      </Note>
    </Frame>
  );
};

window.AdminMerged = AdminMerged;
