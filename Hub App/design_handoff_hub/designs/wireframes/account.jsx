// Customer account / library — post-purchase home.
// shows owned tools, rent-to-own progress, downloads, licenses, billing.

const AC_Topbar = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: `1px dashed ${W.ink2}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>talia duvet</span>
      <Anno>· hub</Anno>
    </div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Anno>jamie@…</Anno>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: W.accent, border: `1.5px solid ${W.ink}` }} />
    </div>
  </div>
);

const AC_Sidebar = () => (
  <div style={{ padding: '20px 16px', borderRight: `1px dashed ${W.ink2}`, background: W.paper2, display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div>
      <Anno>— navigate</Anno>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {[
          ['home', true],
          ['tools', false],
          ['rent-to-own', false],
          ['downloads', false],
          ['licenses', false],
          ['billing', false],
          ['preferences', false],
        ].map(([l, active]) => (
          <div key={l} style={{
            padding: '6px 10px',
            fontSize: 13,
            color: active ? W.ink : W.ink2,
            fontWeight: active ? 700 : 400,
            background: active ? W.paper : 'transparent',
            border: active ? `1.2px solid ${W.ink}` : '1.2px solid transparent',
            borderRadius: 4,
          }}>{l}</div>
        ))}
      </div>
    </div>
    <div style={{ marginTop: 'auto' }}>
      <Anno style={{ textTransform: 'none', color: W.muted }}>— stuck?</Anno>
      <Btn style={{ marginTop: 6 }}>email talia</Btn>
    </div>
  </div>
);

const OwnedCard = ({ name, status, version, owned, accent }) => (
  <div className="wf-box" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div className="wf-sketch" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{name}</div>
      <Pill variant={status}>{status}</Pill>
    </div>
    <Anno>v{version} · last opened 2d ago</Anno>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
      {['ios', 'web', 'pwa'].map(p => (
        <div key={p} className="wf-box-soft" style={{ padding: '6px 8px', textAlign: 'center' }}>
          <Anno>{p}</Anno>
        </div>
      ))}
    </div>
    {owned && (
      <div className="wf-box-soft" style={{ padding: '6px 10px', background: W.paper2 }}>
        <Anno style={{ textTransform: 'none', color: W.accent2, fontWeight: 600 }}>★ owned forever</Anno>
      </div>
    )}
    <div style={{ display: 'flex', gap: 6 }}>
      <Btn accent>open</Btn>
      <Btn>download</Btn>
      <Btn>license key</Btn>
    </div>
  </div>
);

const R2OCard = ({ name, paid, total, monthly, nextDate, accent }) => {
  const pct = Math.round((paid / total) * 100);
  return (
    <div className="wf-box" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{name}</div>
        <Pill>renting</Pill>
      </div>
      {/* progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Anno>month {paid} of {total}</Anno>
          <Anno style={{ color: W.accent2 }}>{pct}% owned</Anno>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 10,
              background: i < paid ? (accent ?? W.accent) : W.paper2,
              border: `1px solid ${W.ink2}`,
              borderRadius: 3,
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div>
          <Anno>monthly</Anno>
          <div style={{ fontFamily: W.mono, fontSize: 14, color: W.ink, fontWeight: 600 }}>{monthly}</div>
        </div>
        <div>
          <Anno>next charge</Anno>
          <div style={{ fontFamily: W.mono, fontSize: 14, color: W.ink, fontWeight: 600 }}>{nextDate}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn>pay off now</Btn>
        <Btn>change plan</Btn>
        <Anno style={{ marginLeft: 'auto', alignSelf: 'center' }}>cancel anytime</Anno>
      </div>
    </div>
  );
};

const AccountLibrary = () => (
  <Frame label="hub.taliaduvet.com">
    <AC_Topbar />
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', height: '100%' }}>
      <AC_Sidebar />

      <div style={{ padding: '20px 28px', overflow: 'auto' }}>
        {/* greeting */}
        <div>
          <Anno>— welcome back</Anno>
          <div className="wf-sketch" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>
            morning, jamie.
          </div>
          <Anno style={{ textTransform: 'none', marginTop: 4 }}>2 tools owned · 1 renting · 1 on waitlist</Anno>
        </div>

        {/* today strip */}
        <div className="wf-box-soft" style={{ marginTop: 14, padding: '10px 14px', background: W.paper2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
            <Anno style={{ color: W.accent2 }}>— today, across your tools</Anno>
            <Anno color={W.muted}>wed, may 21</Anno>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
            <div>
              <Anno style={{ fontSize: 8.5 }}>vein</Anno>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, marginTop: 2, color: W.ink }}>
                3 memos captured this week · 1 needs transcribing
              </div>
            </div>
            <div>
              <Anno style={{ fontSize: 8.5 }}>ledger</Anno>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, marginTop: 2, color: W.ink }}>
                jun bookkeeping up to date · gst due jul 31
              </div>
            </div>
            <div>
              <Anno style={{ fontSize: 8.5 }}>production</Anno>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, marginTop: 2, color: W.ink }}>
                new sketch dropped · thursday dispatch
              </div>
            </div>
          </div>
        </div>

        {/* preferences · user-level accent color */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div className="wf-box-soft" style={{ padding: 14, background: W.paper }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Anno>— your action color</Anno>
              <Anno color={W.muted}>applies across vein, ledger, production</Anno>
            </div>
            <Note style={{ marginTop: 6, fontSize: 15 }}>
              pick once · carries you through every tool.
            </Note>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                ['violet · house', '#9b6cff', true],
                ['periwinkle',      '#b0cdfd'],
                ['mauve',           '#b198b1'],
                ['peach',           '#fbcb94'],
                ['sage',            '#8bcba6'],
                ['gold',            '#fcd47a'],
              ].map(([n, c, active]) => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: '50%', background: c,
                    border: active ? `2px solid ${W.ink}` : `1px solid ${W.ink2}`,
                    boxShadow: active ? `2px 2px 0 ${c}` : 'none',
                  }} />
                  <Anno style={{ color: active ? W.ink : W.muted, fontSize: 8.5, fontWeight: active ? 700 : 400 }}>
                    {n}
                  </Anno>
                </div>
              ))}
            </div>
          </div>
          <div className="wf-box-dashed" style={{ padding: 14 }}>
            <Anno>— preferences</Anno>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['email digest', 'weekly'],
                ['notifications', 'silent · only billing'],
                ['data export', 'download everything'],
              ].map(([t, sub]) => (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 500 }}>{t}</div>
                  <Anno color={W.muted}>{sub}</Anno>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OWNED row */}
        <div style={{ marginTop: 22 }}>
          <Anno>— your tools</Anno>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
            <OwnedCard name="Vein" status="live" version="1.3" owned />
            <R2OCard name="Ledger" paid={2} total={5} monthly="$7.00" nextDate="jun 12" />
            <div className="wf-box-dashed" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>Production</div>
                <Pill variant="soon">soon</Pill>
              </div>
              <Anno style={{ textTransform: 'none' }}>you're on the waitlist · #214</Anno>
              <Anno style={{ textTransform: 'none', color: W.muted }}>early-access pricing reserved.</Anno>
              <div style={{ marginTop: 'auto' }}><Btn>view waitlist</Btn></div>
            </div>
          </div>
        </div>

        {/* rent-to-own detail */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div className="wf-box" style={{ padding: 14 }}>
            <Anno>— rent-to-own · ledger</Anno>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Anno>paid so far</Anno>
                <div className="wf-sketch" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>$14</div>
                <Anno style={{ textTransform: 'none' }}>of $35 total</Anno>
              </div>
              <div>
                <Anno>remaining</Anno>
                <div className="wf-sketch" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>$21</div>
                <Anno style={{ textTransform: 'none' }}>3 months left</Anno>
              </div>
            </div>
            {/* tiny payment history */}
            <div style={{ marginTop: 14 }}>
              <Anno>payments</Anno>
              <div style={{ marginTop: 6 }}>
                {[
                  ['apr 12', '$7.00', 'paid'],
                  ['may 12', '$7.00', 'paid'],
                  ['jun 12', '$7.00', 'scheduled'],
                  ['jul 12', '$7.00', 'scheduled'],
                  ['aug 12', '$7.00', 'scheduled · final'],
                ].map(([d, a, s], i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 70px 1fr',
                    padding: '6px 0',
                    borderTop: i === 0 ? 'none' : `1px dashed ${W.ink2}`,
                    fontFamily: W.mono,
                    fontSize: 12,
                    color: W.ink2,
                  }}>
                    <span>{d}</span>
                    <span>{a}</span>
                    <span style={{ color: s === 'paid' ? W.muted : W.accent2 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Btn accent>pay off · $21</Btn>
              <Btn>change card</Btn>
            </div>

            {/* change pace strip */}
            <div className="wf-box-soft" style={{ marginTop: 12, padding: 10, background: W.paper2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Anno style={{ color: W.accent2 }}>— change your pace</Anno>
                <Anno>$21 remaining · cap 7 mo</Anno>
              </div>
              <Anno style={{ textTransform: 'none', color: W.ink2, marginTop: 4 }}>
                speed it up or stretch it out · cap stays the same
              </Anno>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  ['pay off now', '$21'],
                  ['1 mo', '$21/mo'],
                  ['2 mo', '$10.50/mo'],
                  ['3 mo', '$7/mo', true],
                  ['5 mo · cap', '$5/mo'],
                ].map(([n, p, active]) => (
                  <div key={n} className={active ? 'wf-box' : 'wf-box-soft'} style={{
                    padding: '4px 10px',
                    background: active ? W.accent : W.paper,
                    color: active ? 'white' : W.ink2,
                    borderColor: active ? W.accent2 : W.ink2,
                    cursor: 'default',
                  }}>
                    <Anno style={{ color: 'inherit', fontWeight: 600 }}>{n}</Anno>
                    <div style={{ fontFamily: W.mono, fontSize: 10, color: 'inherit' }}>{p}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <Btn accent>apply</Btn>
                <Anno style={{ alignSelf: 'center', color: W.muted }}>takes effect next charge</Anno>
              </div>
            </div>
          </div>

          <div className="wf-box-soft" style={{ padding: 14 }}>
            <Anno>— license keys</Anno>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Vein', 'V1N-A4K9-7QXP-RT22', 'owned'],
                ['Ledger', 'LDG-B7M2-1ZAR-X9PW', 'rent-to-own'],
              ].map(([n, k, s]) => (
                <div key={n} className="wf-box-soft" style={{ padding: 10, background: W.paper }}>
                  <Anno>{n}</Anno>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontFamily: W.mono, fontSize: 13, color: W.ink }}>{k}</div>
                    <Anno>copy</Anno>
                  </div>
                  <Anno style={{ textTransform: 'none', marginTop: 4, color: W.muted }}>{s}</Anno>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* downloads */}
        <div style={{ marginTop: 22 }}>
          <Anno>— downloads</Anno>
          <div className="wf-box" style={{ padding: 12, marginTop: 8 }}>
            {[
              ['Vein · ios', 'app store link', '↗'],
              ['Vein · android', 'play store link', '↗'],
              ['Vein · web', 'open in browser', '↗'],
              ['Vein · pwa', 'install instructions', '↗'],
              ['Ledger · web', 'open in browser', '↗'],
            ].map(([n, l, ic], i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 30px',
                padding: '8px 6px',
                borderTop: i === 0 ? 'none' : `1px dashed ${W.ink2}`,
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
                <Anno>{l}</Anno>
                <Anno style={{ textAlign: 'right' }}>{ic}</Anno>
              </div>
            ))}
          </div>
        </div>

        {/* dev note */}
        <Note style={{ marginTop: 22, fontSize: 14, color: W.accent2, textAlign: 'center' }}>
          this is the hub — where a buyer lands after checkout, where everything they own lives,
          and where the one user-level accent color is set.
        </Note>
      </div>
    </div>
  </Frame>
);

window.AccountLibrary = AccountLibrary;
