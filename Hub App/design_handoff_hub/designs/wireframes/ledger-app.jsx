// ledger-app.jsx — Ledger reskin proposal · Hub brand applied
// Mid-fi mockups (paper surface · violet action · mauve as Ledger's flavor)
// Desktop-first since Ledger is a web app.

const L = {
  bg: '#f6f0e3',
  bg2: '#ece4d2',
  bg3: '#e2d8c2',
  ink: '#1a1816',
  ink2: '#3d3833',
  inkMuted: '#7a7268',
  inkFaint: '#aea69a',
  // Action color · users pick this; falls back to house violet
  accent: 'var(--user-accent, #9b6cff)',
  accentDeep: 'var(--user-accent-deep, #7a4ce0)',
  accentSoft: 'var(--user-accent-soft, #b89cff)',
  accentGlow: 'var(--user-accent-glow, rgba(155,108,255,0.25))',
  // Ledger's flavor on the hub (kept fixed)
  mauve: '#b198b1',
  mauveDeep: '#8a6e8c',
  mauveSoft: 'rgba(177,152,177,0.10)',
  positive: '#7ba88e',
  negative: '#c46556',
  star: '#fcd47a',
  fontD: '"Instrument Serif", Georgia, serif',
  fontB: '"Inter", -apple-system, sans-serif',
  fontM: '"JetBrains Mono", ui-monospace, monospace',
};

const LBrowserFrame = ({ children, url = 'ledger.taliaduvet.com' }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: L.bg,
      color: L.ink,
      fontFamily: L.fontB,
      border: `1px solid ${L.inkFaint}`,
      borderRadius: 10,
    }}
  >
    <div style={{
      padding: '8px 14px',
      display: 'flex', alignItems: 'center', gap: 8,
      background: L.bg2, borderBottom: `1px solid ${L.inkFaint}`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: '#d96b5f' }} />
      <span style={{ width: 8, height: 8, borderRadius: 4, background: '#e5b94d' }} />
      <span style={{ width: 8, height: 8, borderRadius: 4, background: '#7aa674' }} />
      <span style={{
        marginLeft: 12, padding: '3px 12px',
        border: `1px solid ${L.inkFaint}`, borderRadius: 4,
        fontFamily: L.fontM, fontSize: 10, color: L.inkMuted,
        flex: '0 1 auto',
      }}>
        {url}
      </span>
    </div>
    <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      {children}
    </div>
  </div>
);

// shared bits ─────────────────────────────────────────────────────
const LLogo = ({ size = 26, sub }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
    <span style={{ fontFamily: L.fontD, fontSize: size, lineHeight: 1, letterSpacing: '-0.01em' }}>
      ledger
    </span>
    {sub && (
      <span style={{ fontFamily: L.fontM, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: L.inkMuted }}>
        {sub}
      </span>
    )}
  </div>
);

const LMonoCap = ({ children, color = L.inkMuted, size = 10 }) => (
  <span style={{ fontFamily: L.fontM, fontSize: size, letterSpacing: '0.22em', textTransform: 'uppercase', color }}>
    {children}
  </span>
);

const LBtn = ({ children, primary = false, ghost = false, style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '9px 18px',
    fontFamily: L.fontM, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    fontWeight: 500,
    background: primary ? L.accent : 'transparent',
    color: primary ? '#f6f0e3' : ghost ? L.accent : L.ink,
    border: `1px solid ${primary ? L.accent : ghost ? L.accent : L.ink}`,
    outline: primary ? `1px solid ${L.accent}` : 'none',
    outlineOffset: 3,
    cursor: 'pointer', ...style,
  }}>
    {primary && <span style={{ marginRight: 6 }}>★</span>}
    {children}
  </span>
);

const LPill = ({ children, tone = 'ink', filled = false }) => {
  const colorMap = { ink: L.ink, accent: L.accent, mauve: L.mauveDeep, positive: L.positive, negative: L.negative, muted: L.inkMuted };
  const c = colorMap[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 999,
      border: `1px solid ${c}`,
      color: filled ? '#f6f0e3' : c,
      background: filled ? c : 'transparent',
      fontFamily: L.fontM, fontSize: 9.5, fontWeight: 500,
      letterSpacing: '0.2em', textTransform: 'uppercase',
    }}>{children}</span>
  );
};

const LTabs = ({ active = 'today' }) => (
  <div style={{ display: 'flex', gap: 4, padding: '8px 24px 0', borderBottom: `1px solid ${L.inkFaint}`, flexWrap: 'wrap' }}>
    {[
      ['today',   'today'],
      ['books',   'books'],
      ['plan',    'plan'],
      ['reports', 'reports'],
    ].map(([label, key]) => {
      const on = active === key;
      return (
        <span key={key} style={{
          padding: '8px 16px',
          fontFamily: L.fontM, fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: on ? L.accent : L.inkMuted,
          fontWeight: on ? 600 : 500,
          borderBottom: on ? `2px solid ${L.accent}` : '2px solid transparent',
          marginBottom: -1,
        }}>{label}</span>
      );
    })}
    <span style={{ marginLeft: 'auto', alignSelf: 'center', paddingBottom: 8 }}>
      <span style={{
        fontFamily: L.fontM, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: L.inkFaint,
      }}>q2 · 2026</span>
    </span>
  </div>
);

const LTopbar = ({ active = 'dashboard' }) => (
  <div style={{ background: L.bg }}>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 24px',
    }}>
      <LLogo size={22} sub="sole-prop · canada" />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <LMonoCap>fiscal 2026 · q2</LMonoCap>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: L.mauveSoft, border: `1px solid ${L.mauve}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: L.fontM, fontSize: 11, color: L.mauveDeep,
        }}>t</span>
      </div>
    </div>
    <LTabs active={active} />
  </div>
);

// ── 1. SIGN IN ────────────────────────────────────────────────────
const LedgerLogin = () => (
  <LBrowserFrame url="ledger.taliaduvet.com/sign-in">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
      {/* form */}
      <div style={{ padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <LMonoCap>— sign in</LMonoCap>
        <div style={{ fontFamily: L.fontD, fontSize: 48, lineHeight: 1, letterSpacing: '-0.015em' }}>
          back to your <span style={{ fontStyle: 'italic', color: L.accent }}>books.</span>
        </div>
        <div style={{ fontFamily: L.fontB, fontSize: 14, color: L.inkMuted, marginTop: 4, lineHeight: 1.5 }}>
          sole-prop accounting · CRA T2125-aligned · made in canada with feeling.
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
          <div>
            <LMonoCap size={10}>email</LMonoCap>
            <div style={{
              marginTop: 4, padding: '10px 12px',
              background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 8,
              fontFamily: L.fontM, fontSize: 13, color: L.inkMuted,
            }}>you@studio.com</div>
          </div>
          <div>
            <LMonoCap size={10}>password</LMonoCap>
            <div style={{
              marginTop: 4, padding: '10px 12px',
              background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 8,
              fontFamily: L.fontM, fontSize: 13, color: L.inkMuted,
            }}>••••••••</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <LBtn primary>sign in</LBtn>
            <LBtn>create account</LBtn>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <LMonoCap color={L.inkFaint} size={9}>v2 · spring 2026 · tools from talia duvet</LMonoCap>
        </div>
      </div>

      {/* poster — mauve flavored, calm */}
      <div style={{
        background: L.bg2,
        padding: 48,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderLeft: `1px solid ${L.inkFaint}`,
      }}>
        {/* mauve glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 30%, rgba(177,152,177,0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <LMonoCap color={L.mauveDeep}>— phase ii · agency</LMonoCap>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: L.fontD, fontStyle: 'italic', fontSize: 34, lineHeight: 1.12, letterSpacing: '-0.01em' }}>
            for taking the wheel back<br/>from a shoebox of receipts.
          </div>
          <LMonoCap color={L.inkMuted}>
            <div style={{ marginTop: 14 }}>T2125 categories · GST per province · wealthsimple-ready</div>
          </LMonoCap>
        </div>
        <div style={{ display: 'flex', gap: 14, opacity: 0.8 }}>
          {['CRA T2125', 'GST/HST', 'wealthsimple'].map(t => (
            <LPill key={t} tone="mauve">{t}</LPill>
          ))}
        </div>
      </div>
    </div>
  </LBrowserFrame>
);

// ── 2. DASHBOARD ──────────────────────────────────────────────────
const LedgerDashboard = () => (
  <LBrowserFrame url="ledger.taliaduvet.com/dashboard">
    <LTopbar active="today" />

    {/* period strip */}
    <div style={{
      padding: '16px 24px',
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      borderBottom: `1px solid ${L.inkFaint}`,
    }}>
      <LMonoCap>period</LMonoCap>
      <div style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 6, fontFamily: L.fontM, fontSize: 12 }}>
        apr 1 → jun 30
      </div>
      <LMonoCap color={L.inkFaint}>· q2 · 2026</LMonoCap>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <LBtn>+ income</LBtn>
        <LBtn>+ expense</LBtn>
      </div>
    </div>

    {/* greeting */}
    <div style={{ padding: '24px 24px 8px' }}>
      <LMonoCap>— this quarter, at a glance</LMonoCap>
      <div style={{ fontFamily: L.fontD, fontSize: 40, lineHeight: 1, letterSpacing: '-0.015em', marginTop: 6 }}>
        you're <span style={{ fontStyle: 'italic', color: L.positive }}>up $2,340.</span>
      </div>
      <div style={{ fontFamily: L.fontB, fontSize: 13.5, color: L.inkMuted, marginTop: 4 }}>
        keep going. next gst remit is jul 31.
      </div>
    </div>

    {/* KPI cards */}
    <div style={{ padding: '12px 24px 18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {[
        ['income', '$8,420', '12 entries', L.positive],
        ['expenses', '$6,080', '34 entries', L.negative],
        ['net', '$2,340', '~ 28% margin', L.ink],
        ['gst collected', '$421', 'remit jul 31', L.mauveDeep],
      ].map(([l, v, sub, c], i) => (
        <div key={i} style={{
          padding: 14, background: '#fff',
          border: `1px solid ${L.inkFaint}`, borderRadius: 12,
        }}>
          <LMonoCap size={9.5}>{l}</LMonoCap>
          <div style={{ fontFamily: L.fontD, fontSize: 28, lineHeight: 1, marginTop: 6, color: c, letterSpacing: '-0.01em' }}>
            {v}
          </div>
          <div style={{ fontFamily: L.fontM, fontSize: 10, color: L.inkFaint, marginTop: 4, letterSpacing: '0.04em' }}>{sub}</div>
        </div>
      ))}
    </div>

    {/* split: recent activity | T2125 mini */}
    <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
      {/* recent */}
      <div>
        <LMonoCap>— recent activity</LMonoCap>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12, overflow: 'hidden' }}>
          {[
            ['jun 6',  'spotify · streaming · may',     'income · royalties', '+$284.12', 'pos'],
            ['jun 4',  'long & mcquade · monitor cable', 'expense · equipment', '-$48.20', 'neg'],
            ['jun 2',  'mandolin records · advance',    'income · sync',       '+$1,200', 'pos'],
            ['jun 1',  'dropbox · storage',             'expense · software',  '-$11.95', 'neg'],
            ['may 30', 'rogers · phone',                'expense · utilities · biz %', '-$32.40', 'neg'],
          ].map(([d, t, m, a, sign], i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '70px 1fr 1fr 90px',
              alignItems: 'center', padding: '11px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${L.inkFaint}`,
            }}>
              <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{d}</span>
              <span style={{ fontFamily: L.fontB, fontSize: 13.5 }}>{t}</span>
              <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{m}</span>
              <span style={{
                fontFamily: L.fontM, fontSize: 13, fontWeight: 600, textAlign: 'right',
                color: sign === 'pos' ? L.positive : L.negative,
              }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* T2125 mini */}
      <div>
        <LMonoCap>— T2125, so far this year</LMonoCap>
        <div style={{ marginTop: 8, padding: 14, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
          {[
            ['Line 8000 · gross sales', '$28,420'],
            ['Line 8519 · cost of goods', '–'],
            ['Line 9060 · advertising', '$340'],
            ['Line 9220 · supplies', '$1,420'],
            ['Line 9224 · utilities (biz %)', '$612'],
            ['Line 9270 · other', '$280'],
          ].map(([l, v], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0',
              borderTop: i === 0 ? 'none' : `1px dashed ${L.inkFaint}`,
              fontFamily: L.fontM, fontSize: 12, color: L.ink2,
            }}>
              <span style={{ color: L.inkMuted }}>{l}</span>
              <span>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${L.ink2}`, display: 'flex', justifyContent: 'space-between' }}>
            <LMonoCap>net income</LMonoCap>
            <span style={{ fontFamily: L.fontD, fontSize: 22, color: L.positive }}>$8,420</span>
          </div>
          <div style={{ marginTop: 12 }}><LBtn>view full t2125 →</LBtn></div>
        </div>
      </div>
    </div>
  </LBrowserFrame>
);

// ── 3. EXPENSES ───────────────────────────────────────────────────
const LedgerExpenses = () => (
  <LBrowserFrame url="ledger.taliaduvet.com/expenses">
    <LTopbar active="books" />

    <div style={{ padding: '16px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${L.inkFaint}` }}>
      <LMonoCap>period</LMonoCap>
      <div style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 6, fontFamily: L.fontM, fontSize: 12 }}>
        apr 1 → jun 30
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <LBtn primary>+ add expense</LBtn>
      </div>
    </div>

    {/* summary + by category */}
    <div style={{ padding: '20px 24px 14px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
      <div style={{ padding: 16, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap>— total · this period</LMonoCap>
        <div style={{ fontFamily: L.fontD, fontSize: 40, lineHeight: 1, color: L.negative, marginTop: 6 }}>$6,080</div>
        <div style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkFaint, marginTop: 4 }}>34 entries · 11 with receipts</div>
        <div style={{ marginTop: 12, fontFamily: L.fontB, fontSize: 12.5, color: L.inkMuted, lineHeight: 1.5 }}>
          ↑ 8% vs last quarter · driven by gear month
        </div>
      </div>

      <div style={{ padding: 16, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap>— by category</LMonoCap>
        <div style={{ marginTop: 8 }}>
          {[
            ['equipment',           '$2,140', 35],
            ['software · subs',     '$1,180', 19],
            ['utilities · biz %',   '$880',   14],
            ['supplies',            '$720',   12],
            ['travel',              '$540',    9],
            ['other',               '$620',   10],
          ].map(([cat, amt, pct], i) => (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: L.fontB, fontSize: 12.5 }}>{cat}</span>
                <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{amt} · {pct}%</span>
              </div>
              <div style={{ height: 5, background: L.bg2, borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct * 2.5}%`, height: '100%', background: L.accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* expense list */}
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <LMonoCap>— entries</LMonoCap>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 10px', background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 6, fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>
            search…
          </div>
          {['all', 'equipment', 'software', 'travel'].map((c, i) => (
            <span key={c} style={{
              padding: '4px 10px',
              fontFamily: L.fontM, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
              border: `1px solid ${i === 0 ? L.accent : L.inkFaint}`,
              color: i === 0 ? L.accent : L.inkMuted,
              background: i === 0 ? 'transparent' : 'transparent',
              borderRadius: 999,
            }}>{c}</span>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1.4fr 1fr 80px 100px 60px',
          padding: '10px 14px', background: L.bg2, borderBottom: `1px solid ${L.inkFaint}`,
          fontFamily: L.fontM, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: L.inkMuted,
        }}>
          <span>date</span>
          <span>vendor / description</span>
          <span>category · T2125</span>
          <span>biz %</span>
          <span style={{ textAlign: 'right' }}>amount</span>
          <span style={{ textAlign: 'right' }}>rcpt</span>
        </div>

        {[
          ['jun 04', 'long & mcquade · monitor cable',   'equipment · 9221',  '100%', '$48.20', '✓'],
          ['jun 01', 'dropbox · storage',                'software · 9270',   '100%', '$11.95', '·'],
          ['may 30', 'rogers · phone',                   'utilities · 9224',  '60%',  '$32.40', '✓'],
          ['may 28', 'sweetwater · interface',           'equipment · 9221',  '100%', '$420.00', '✓'],
          ['may 22', 'figma · annual',                   'software · 9270',   '100%', '$144.00', '·'],
          ['may 19', 'bc hydro · studio',                'utilities · 9224',  '60%',  '$76.20', '✓'],
          ['may 12', 'shipping · merch',                 'cost of goods · 8519', '100%', '$22.50', '·'],
          ['may 08', 'metro · drum heads',               'supplies · 9270',   '100%', '$54.10', '✓'],
        ].map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1.4fr 1fr 80px 100px 60px',
            padding: '11px 14px',
            borderTop: i === 0 ? 'none' : `1px solid ${L.inkFaint}`,
            fontFamily: L.fontB, fontSize: 13,
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{row[0]}</span>
            <span>{row[1]}</span>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.mauveDeep }}>{row[2]}</span>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{row[3]}</span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: L.negative }}>{row[4]}</span>
            <span style={{ textAlign: 'right', color: row[5] === '✓' ? L.positive : L.inkFaint, fontFamily: L.fontM }}>{row[5]}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <LBtn>import csv</LBtn>
        <LBtn>export · year-end</LBtn>
      </div>
    </div>
  </LBrowserFrame>
);

// ── 4. REPORTS · the T2125 magic moment ─────────────────────────────
const LedgerReports = () => (
  <LBrowserFrame url="ledger.taliaduvet.com/reports">
    <LTopbar active="reports" />

    <div style={{ padding: '16px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${L.inkFaint}` }}>
      <LMonoCap>period</LMonoCap>
      <div style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 6, fontFamily: L.fontM, fontSize: 12 }}>
        jan 1 → dec 31 · 2025
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <LBtn>print</LBtn>
        <LBtn primary>export → wealthsimple tax</LBtn>
      </div>
    </div>

    <div style={{ padding: '24px 24px 12px' }}>
      <LMonoCap>— year-end · 2025</LMonoCap>
      <div style={{ fontFamily: L.fontD, fontSize: 44, lineHeight: 1, letterSpacing: '-0.015em', marginTop: 6 }}>
        a year, <span style={{ fontStyle: 'italic', color: L.accent }}>summarized.</span>
      </div>
      <div style={{ fontFamily: L.fontB, fontSize: 14, color: L.inkMuted, marginTop: 4, maxWidth: 540 }}>
        the long form lives below · numbers are reconciled against your bank · ready to paste into wealthsimple tax.
      </div>
    </div>

    {/* T2125 summary */}
    <div style={{ padding: '0 24px 20px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
      <div style={{ padding: 18, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <LMonoCap>— form T2125 · summary</LMonoCap>
          <LPill tone="mauve">draft · not filed</LPill>
        </div>
        <div style={{ marginTop: 10 }}>
          {[
            ['Line 8000 · gross sales / fees',        '$42,180', false],
            ['Line 8519 · cost of goods sold',         '$1,240',  false],
            ['Line 8299 · gross profit',               '$40,940', true],
            ['Line 9060 · advertising',                '$640',    false],
            ['Line 9221 · equipment / instruments',    '$3,840',  false],
            ['Line 9224 · utilities (biz % of home)',  '$1,820',  false],
            ['Line 9270 · other (subs, supplies, fx)', '$4,180',  false],
            ['Line 9368 · total expenses',             '$10,480', true],
            ['Line 9369 · net income',                 '$30,460', true],
          ].map(([l, v, total], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: i === 0 ? 'none' : `1px ${total ? 'solid' : 'dashed'} ${L.inkFaint}`,
              fontFamily: total ? L.fontB : L.fontM,
              fontSize: total ? 14 : 12.5,
              fontWeight: total ? 600 : 400,
            }}>
              <span style={{ color: total ? L.ink : L.inkMuted }}>{l}</span>
              <span style={{ color: total ? L.ink : L.ink2 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GST per province */}
      <div style={{ padding: 18, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap>— GST / HST · 2025</LMonoCap>
        <div style={{ marginTop: 10 }}>
          {[
            ['BC',  '5%',  '$31,400', '$1,570'],
            ['ON',  '13%', '$6,200',  '$806'],
            ['QC',  '5%',  '$2,180',  '$109'],
            ['AB',  '5%',  '$2,400',  '$120'],
          ].map(([p, r, sales, owed], i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '40px 50px 1fr 90px',
              padding: '8px 0', alignItems: 'baseline',
              borderTop: i === 0 ? 'none' : `1px dashed ${L.inkFaint}`,
              fontFamily: L.fontM, fontSize: 12,
            }}>
              <span style={{ fontWeight: 600 }}>{p}</span>
              <span style={{ color: L.inkMuted }}>{r}</span>
              <span style={{ color: L.inkMuted }}>{sales} sales</span>
              <span style={{ textAlign: 'right', color: L.mauveDeep, fontWeight: 600 }}>{owed}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${L.ink2}`, display: 'flex', justifyContent: 'space-between' }}>
            <LMonoCap>total owed</LMonoCap>
            <span style={{ fontFamily: L.fontD, fontSize: 22, color: L.mauveDeep }}>$2,605</span>
          </div>
          <div style={{ marginTop: 10, fontFamily: L.fontB, fontSize: 12, color: L.inkMuted, lineHeight: 1.45 }}>
            next quarterly remit · jul 31, 2026
          </div>
        </div>
      </div>
    </div>

    {/* footer reassurance */}
    <div style={{ padding: '0 24px 18px' }}>
      <div style={{
        padding: 14,
        border: `1px dashed ${L.mauve}`, borderRadius: 10,
        background: L.mauveSoft,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14,
      }}>
        <div>
          <LMonoCap color={L.mauveDeep}>— ready when you are</LMonoCap>
          <div style={{ fontFamily: L.fontB, fontSize: 13, color: L.ink2, marginTop: 4 }}>
            every number above maps to a CRA line · click any row to see the underlying entries.
          </div>
        </div>
        <LBtn primary>export → wealthsimple tax</LBtn>
      </div>
    </div>

    {/* GF medical claim · folded in as a Reports section */}
    <div style={{ padding: '0 24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <LMonoCap>— gluten-free medical claim · lines 33099 / 33199</LMonoCap>
        <LPill tone="mauve">section of reports</LPill>
      </div>
      <div style={{
        marginTop: 8, padding: 18, background: '#fff',
        border: `1px solid ${L.inkFaint}`, borderRadius: 12,
        display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18,
      }}>
        {/* totals */}
        <div>
          <LMonoCap size={9.5}>— 2025 summary</LMonoCap>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <LMonoCap size={9.5} color={L.inkFaint}>gf items logged</LMonoCap>
              <div style={{ fontFamily: L.fontD, fontSize: 26, lineHeight: 1, marginTop: 4 }}>148</div>
              <div style={{ fontFamily: L.fontM, fontSize: 10, color: L.inkFaint, marginTop: 4 }}>across 32 receipts</div>
            </div>
            <div>
              <LMonoCap size={9.5} color={L.inkFaint}>incremental cost · claimable</LMonoCap>
              <div style={{ fontFamily: L.fontD, fontSize: 26, lineHeight: 1, color: L.mauveDeep, marginTop: 4 }}>$842.10</div>
              <div style={{ fontFamily: L.fontM, fontSize: 10, color: L.inkFaint, marginTop: 4 }}>gf paid − regular price</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <LMonoCap size={9.5}>top items</LMonoCap>
            <div style={{ marginTop: 6 }}>
              {[
                ['glutenull bread',          24, '$184.20'],
                ['schar pasta · 400g',       18, '$112.40'],
                ['cup4cup flour · 907g',     11, '$96.80'],
                ['oat flour blend (certified)',  9, '$48.10'],
              ].map(([p, n, amt], i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 80px',
                  padding: '7px 0', alignItems: 'baseline',
                  borderTop: i === 0 ? 'none' : `1px dashed ${L.inkFaint}`,
                  fontFamily: L.fontM, fontSize: 11.5,
                }}>
                  <span>{p}</span>
                  <span style={{ color: L.inkMuted }}>{n}×</span>
                  <span style={{ textAlign: 'right', color: L.mauveDeep, fontWeight: 600 }}>{amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* explainer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: 14, background: L.bg2, borderRadius: 10,
            fontFamily: L.fontB, fontSize: 12.5, lineHeight: 1.5, color: L.ink2,
          }}>
            <LMonoCap size={9.5}>how it works</LMonoCap>
            <div style={{ marginTop: 6 }}>
              log gluten-free items as you buy them. enter the regular non-GF price.
              the <em>difference</em> is what you can claim as a medical expense — lines 33099 / 33199 of your return.
            </div>
          </div>
          <div style={{
            padding: 12, border: `1px dashed ${L.inkFaint}`, borderRadius: 10,
            fontFamily: L.fontB, fontSize: 12, color: L.inkMuted, lineHeight: 1.5,
          }}>
            keep your celiac diagnosis letter on file · CRA may ask for it with your medical expenses.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <LBtn>log a receipt</LBtn>
            <LBtn>export · gf csv + zip</LBtn>
          </div>
        </div>
      </div>
    </div>
  </LBrowserFrame>
);

// ── 5. BOOKS · the consolidated Income + Expenses + Bank ──────────
const LedgerBooks = () => (
  <LBrowserFrame url="ledger.taliaduvet.com/books">
    <LTopbar active="books" />

    {/* period + actions */}
    <div style={{ padding: '16px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${L.inkFaint}` }}>
      <LMonoCap>period</LMonoCap>
      <div style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 6, fontFamily: L.fontM, fontSize: 12 }}>
        apr 1 → jun 30
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <LBtn>import bank csv</LBtn>
        <LBtn>+ income</LBtn>
        <LBtn primary>+ expense</LBtn>
      </div>
    </div>

    {/* split summary · income vs expense vs unreconciled */}
    <div style={{ padding: '18px 24px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <div style={{ padding: 14, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap size={9.5}>income · this period</LMonoCap>
        <div style={{ fontFamily: L.fontD, fontSize: 28, lineHeight: 1, color: L.positive, marginTop: 6 }}>$8,420</div>
        <div style={{ fontFamily: L.fontM, fontSize: 10, color: L.inkFaint, marginTop: 4 }}>12 entries</div>
      </div>
      <div style={{ padding: 14, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap size={9.5}>expenses · this period</LMonoCap>
        <div style={{ fontFamily: L.fontD, fontSize: 28, lineHeight: 1, color: L.negative, marginTop: 6 }}>$6,080</div>
        <div style={{ fontFamily: L.fontM, fontSize: 10, color: L.inkFaint, marginTop: 4 }}>34 entries · 11 with receipts</div>
      </div>
      <div style={{ padding: 14, background: L.mauveSoft, border: `1px solid ${L.mauve}`, borderRadius: 12 }}>
        <LMonoCap size={9.5} color={L.mauveDeep}>unreconciled · from bank</LMonoCap>
        <div style={{ fontFamily: L.fontD, fontSize: 28, lineHeight: 1, color: L.mauveDeep, marginTop: 6 }}>7</div>
        <div style={{ fontFamily: L.fontM, fontSize: 10, color: L.mauveDeep, marginTop: 4 }}>last import · 2d ago · review →</div>
      </div>
    </div>

    {/* filter row */}
    <div style={{ padding: '6px 24px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 6, fontFamily: L.fontM, fontSize: 11, color: L.inkMuted, flex: 1, maxWidth: 280 }}>
        search vendor, description, amount…
      </div>
      {[
        ['all', true],
        ['income', false],
        ['expense', false],
        ['unreconciled', false, 'mauve'],
        ['no receipt', false],
      ].map(([c, on, tone]) => (
        <span key={c} style={{
          padding: '5px 12px',
          fontFamily: L.fontM, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
          border: `1px solid ${on ? L.accent : tone === 'mauve' ? L.mauve : L.inkFaint}`,
          color: on ? L.accent : tone === 'mauve' ? L.mauveDeep : L.inkMuted,
          background: tone === 'mauve' ? L.mauveSoft : 'transparent',
          borderRadius: 999,
        }}>{c}</span>
      ))}
    </div>

    {/* unified transactions table */}
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '70px 80px 1.4fr 1fr 70px 100px 50px',
          padding: '10px 14px', background: L.bg2, borderBottom: `1px solid ${L.inkFaint}`,
          fontFamily: L.fontM, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: L.inkMuted,
        }}>
          <span>date</span>
          <span>type</span>
          <span>vendor / description</span>
          <span>category · T2125</span>
          <span>biz %</span>
          <span style={{ textAlign: 'right' }}>amount</span>
          <span style={{ textAlign: 'right' }}>rcpt</span>
        </div>

        {[
          ['jun 06', 'income',  'spotify · royalties · may',     'royalties · 8000',   '—',    '+$284.12', '·',   'pos'],
          ['jun 04', 'expense', 'long & mcquade · monitor cable', 'equipment · 9221',  '100%', '-$48.20',  '✓',   'neg'],
          ['jun 03', 'bank',    'unreconciled · interac e-tfr',   'click to categorize', '—',  '+$320.00', '·',   'unr'],
          ['jun 02', 'income',  'mandolin records · advance',    'sync · 8000',        '—',    '+$1,200',  '✓',   'pos'],
          ['jun 01', 'expense', 'dropbox · storage',             'software · 9270',    '100%', '-$11.95',  '·',   'neg'],
          ['may 30', 'expense', 'rogers · phone',                'utilities · 9224',   '60%',  '-$32.40',  '✓',   'neg'],
          ['may 28', 'expense', 'sweetwater · interface',        'equipment · 9221',   '100%', '-$420.00', '✓',   'neg'],
          ['may 22', 'expense', 'figma · annual',                'software · 9270',    '100%', '-$144.00', '·',   'neg'],
          ['may 19', 'income',  'live show · banger gallery',    'performance · 8000', '—',    '+$520.00', '✓',   'pos'],
          ['may 18', 'bank',    'unreconciled · debit',          'click to categorize', '—',  '-$78.00',  '·',   'unr'],
        ].map(([d, type, t, cat, biz, amt, rcpt, sign], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '70px 80px 1.4fr 1fr 70px 100px 50px',
            padding: '11px 14px',
            borderTop: i === 0 ? 'none' : `1px solid ${L.inkFaint}`,
            fontFamily: L.fontB, fontSize: 13,
            alignItems: 'center',
            background: sign === 'unr' ? L.mauveSoft : 'transparent',
          }}>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{d}</span>
            <span>
              {type === 'bank' ? (
                <LPill tone="mauve">bank</LPill>
              ) : type === 'income' ? (
                <LPill tone="positive">in</LPill>
              ) : (
                <LPill tone="negative">out</LPill>
              )}
            </span>
            <span>{t}</span>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: cat.startsWith('click') ? L.mauveDeep : L.mauveDeep, fontStyle: cat.startsWith('click') ? 'italic' : 'normal' }}>{cat}</span>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{biz}</span>
            <span style={{
              textAlign: 'right', fontWeight: 600,
              color: sign === 'pos' ? L.positive : sign === 'neg' ? L.negative : L.mauveDeep,
            }}>{amt}</span>
            <span style={{ textAlign: 'right', color: rcpt === '✓' ? L.positive : L.inkFaint, fontFamily: L.fontM }}>{rcpt}</span>
          </div>
        ))}
      </div>

      {/* footer · bulk + export */}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <LMonoCap color={L.inkFaint}>showing 10 of 46 · sorted by date desc</LMonoCap>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn>bulk categorize</LBtn>
          <LBtn>export · csv</LBtn>
        </div>
      </div>
    </div>
  </LBrowserFrame>
);

// ── 6. PLAN · the budget screen ───────────────────────────────────
const LedgerPlan = () => (
  <LBrowserFrame url="ledger.taliaduvet.com/plan">
    <LTopbar active="plan" />

    {/* period selector */}
    <div style={{ padding: '16px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${L.inkFaint}` }}>
      <LMonoCap>period</LMonoCap>
      <div style={{ display: 'flex', gap: 4 }}>
        {[['this month', true], ['next month', false], ['this quarter', false], ['custom', false]].map(([l, on]) => (
          <span key={l} style={{
            padding: '6px 12px', fontFamily: L.fontM, fontSize: 10.5,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            border: `1px solid ${on ? L.accent : L.inkFaint}`,
            color: on ? L.accent : L.inkMuted,
            fontWeight: on ? 600 : 500,
            borderRadius: 6,
          }}>{l}</span>
        ))}
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <LBtn primary>save plan</LBtn>
      </div>
    </div>

    {/* hero · available */}
    <div style={{ padding: '24px 24px 14px' }}>
      <LMonoCap>— available this month</LMonoCap>
      <div style={{
        marginTop: 8, padding: 18,
        background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 14,
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: L.fontD, fontSize: 52, lineHeight: 1, letterSpacing: '-0.015em', color: L.positive }}>
            $1,840
          </div>
          <div style={{ fontFamily: L.fontB, fontSize: 14, color: L.inkMuted, marginTop: 6, lineHeight: 1.45 }}>
            planned income minus planned expenses · before what you've actually earned or spent.
          </div>
        </div>
        <div>
          {/* mini "month sketch" — planned in / out bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <LMonoCap size={9.5}>planned in</LMonoCap>
            <span style={{ fontFamily: L.fontM, fontSize: 12, color: L.positive, fontWeight: 600 }}>$4,200</span>
          </div>
          <div style={{ height: 8, background: L.bg2, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: '100%', height: '100%', background: L.positive }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <LMonoCap size={9.5}>planned out</LMonoCap>
            <span style={{ fontFamily: L.fontM, fontSize: 12, color: L.negative, fontWeight: 600 }}>$2,360</span>
          </div>
          <div style={{ height: 8, background: L.bg2, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: '56%', height: '100%', background: L.negative }} />
          </div>
        </div>
      </div>
    </div>

    {/* planned items table */}
    <div style={{ padding: '12px 24px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <LMonoCap>— expected income &amp; expenses</LMonoCap>
        <LMonoCap color={L.inkFaint}>edit any row, then save</LMonoCap>
      </div>
      <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1.5fr 100px 120px 1fr 60px',
          padding: '10px 14px', background: L.bg2, borderBottom: `1px solid ${L.inkFaint}`,
          fontFamily: L.fontM, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: L.inkMuted,
        }}>
          <span>type</span>
          <span>label</span>
          <span style={{ textAlign: 'right' }}>amount</span>
          <span>recurring</span>
          <span>category · T2125</span>
          <span></span>
        </div>
        {[
          ['income',  'spotify · royalties',         '$280',   'monthly',   'royalties · 8000',         'matched'],
          ['income',  'mandolin records · advance',  '$1,200', 'monthly',   'sync · 8000',              'matched'],
          ['income',  'live shows · avg',            '$680',   'monthly',   'performance · 8000',       '·'],
          ['expense', 'rent (studio · biz %)',       '$540',   'monthly',   'utilities · 9224',         'matched'],
          ['expense', 'dropbox · figma · 1pass',     '$36',    'monthly',   'software · 9270',          'matched'],
          ['expense', 'phone (biz %)',               '$32',    'monthly',   'utilities · 9224',         'matched'],
          ['expense', 'gear · planned avg',          '$200',   'monthly',   'equipment · 9221',         '·'],
        ].map(([type, label, amt, freq, cat, status], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1.5fr 100px 120px 1fr 60px',
            padding: '10px 14px',
            borderTop: i === 0 ? 'none' : `1px solid ${L.inkFaint}`,
            fontFamily: L.fontB, fontSize: 13, alignItems: 'center',
          }}>
            <span>
              {type === 'income'
                ? <LPill tone="positive">in</LPill>
                : <LPill tone="negative">out</LPill>}
            </span>
            <span>{label}</span>
            <span style={{
              textAlign: 'right', fontWeight: 600,
              color: type === 'income' ? L.positive : L.negative,
            }}>{amt}</span>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.inkMuted }}>{freq}</span>
            <span style={{ fontFamily: L.fontM, fontSize: 11, color: L.mauveDeep }}>{cat}</span>
            <span style={{ textAlign: 'right' }}>
              {status === 'matched'
                ? <span style={{ fontFamily: L.fontM, fontSize: 10, color: L.positive }}>● matched</span>
                : <span style={{ color: L.inkFaint }}>···</span>}
            </span>
          </div>
        ))}
        {/* add row */}
        <div style={{
          padding: '12px 14px',
          borderTop: `1px dashed ${L.inkFaint}`,
          fontFamily: L.fontM, fontSize: 11, color: L.accent,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          + add row
        </div>
      </div>
    </div>

    {/* plan vs actual */}
    <div style={{ padding: '20px 24px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ padding: 16, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap>— plan vs actual · this month</LMonoCap>
        <div style={{ marginTop: 10 }}>
          {[
            ['planned income',    '$2,160', null],
            ['actual income',     '$1,484', '-31%'],
            ['planned expenses',  '$808',   null],
            ['actual expenses',   '$612',   '-24%'],
            ['planned surplus',   '$1,352', null, true],
            ['actual net',        '$872',   null, true],
          ].map(([l, v, delta, total], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '7px 0',
              borderTop: i === 0 ? 'none' : `1px ${total ? 'solid' : 'dashed'} ${L.inkFaint}`,
              fontFamily: total ? L.fontB : L.fontM, fontSize: total ? 14 : 12.5,
              fontWeight: total ? 600 : 400,
            }}>
              <span style={{ color: total ? L.ink : L.inkMuted }}>{l}</span>
              <span>
                <span style={{ color: total ? L.ink : L.ink2 }}>{v}</span>
                {delta && <span style={{ marginLeft: 8, fontFamily: L.fontM, fontSize: 10, color: L.inkFaint }}>{delta}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* spending by category (actual) */}
      <div style={{ padding: 16, background: '#fff', border: `1px solid ${L.inkFaint}`, borderRadius: 12 }}>
        <LMonoCap>— actuals vs plan · by category</LMonoCap>
        <div style={{ marginTop: 8 }}>
          {[
            ['equipment',          '$420 / $200',  210, true],
            ['software',           '$36 / $36',    100, false],
            ['utilities · biz %',  '$108 / $572',  19,  false],
            ['supplies',           '$48 / $0',     'over', true],
          ].map(([cat, ratio, pct, over], i) => (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: L.fontB, fontSize: 12.5 }}>{cat}</span>
                <span style={{ fontFamily: L.fontM, fontSize: 11, color: over ? L.negative : L.inkMuted }}>{ratio}</span>
              </div>
              <div style={{ height: 5, background: L.bg2, borderRadius: 3, marginTop: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: typeof pct === 'number' ? `${Math.min(100, pct)}%` : '100%',
                  height: '100%',
                  background: over ? L.negative : L.accent,
                }} />
                {pct === 'over' && (
                  <span style={{
                    position: 'absolute', right: 4, top: -16,
                    fontFamily: L.fontM, fontSize: 9, color: L.negative, fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>unplanned</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <LMonoCap color={L.inkFaint}>halfway through the month · pacing within $200 of plan</LMonoCap>
        </div>
      </div>
    </div>

    {/* hint footer */}
    <div style={{ padding: '14px 24px 24px' }}>
      <div style={{
        padding: 12, border: `1px dashed ${L.mauve}`, borderRadius: 10,
        background: L.mauveSoft,
        fontFamily: L.fontB, fontSize: 12.5, color: L.ink2, lineHeight: 1.5,
      }}>
        ledger learns from your books over time · after 3 months it can suggest planned items based on what actually recurs.
      </div>
    </div>
  </LBrowserFrame>
);

Object.assign(window, { LedgerLogin, LedgerDashboard, LedgerExpenses, LedgerReports, LedgerBooks, LedgerPlan });
