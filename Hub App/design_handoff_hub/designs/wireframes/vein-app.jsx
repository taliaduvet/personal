// vein-app.jsx — Vein reskin proposal · Hub brand applied to existing screens
// Mid-fi mockups (cosmic surface · violet actions · periwinkle as Vein's tone)
// Renders as mobile-width frames since Vein is mobile-first.

const V = {
  bg: '#0c0e1a',
  bg2: '#141731',
  bg3: '#1b1e3a',
  cream: '#f6f0e3',
  creamMuted: 'rgba(246,240,227,0.7)',
  creamFaint: 'rgba(246,240,227,0.45)',
  creamLine: 'rgba(246,240,227,0.12)',
  // Action color · users pick this in onboarding / settings
  accent: 'var(--user-accent, #9b6cff)',
  accentDeep: 'var(--user-accent-deep, #7a4ce0)',
  accentSoft: 'var(--user-accent-soft, #b89cff)',
  accentGlow: 'var(--user-accent-glow, rgba(155,108,255,0.25))',
  peri: '#b0cdfd',                          // Vein's flavor (kept fixed)
  periGlow: 'rgba(176,205,253,0.22)',
  star: '#fcd47a',
  error: '#c46556',
  fontD: '"Instrument Serif", Georgia, serif',
  fontB: '"Inter", -apple-system, sans-serif',
  fontM: '"JetBrains Mono", ui-monospace, monospace',
};

// Curated accent options · all from the hub palette
const VEIN_ACCENT_OPTIONS = [
  { name: 'violet',     value: '#9b6cff', deep: '#7a4ce0', soft: '#b89cff', glow: 'rgba(155,108,255,0.25)', label: 'house · default' },
  { name: 'periwinkle', value: '#b0cdfd', deep: '#8aa9d6', soft: '#cfdcf5', glow: 'rgba(176,205,253,0.30)', label: 'cool blue' },
  { name: 'mauve',      value: '#b198b1', deep: '#8c748c', soft: '#cab5ca', glow: 'rgba(177,152,177,0.30)', label: 'dusty purple' },
  { name: 'peach',      value: '#fbcb94', deep: '#d39c63', soft: '#fde0b9', glow: 'rgba(251,203,148,0.30)', label: 'warm cream' },
  { name: 'sage',       value: '#8bcba6', deep: '#5fa17c', soft: '#b1ddc1', glow: 'rgba(139,203,166,0.30)', label: 'mint green' },
  { name: 'gold',       value: '#fcd47a', deep: '#c9a44e', soft: '#fde2a5', glow: 'rgba(252,212,122,0.30)', label: 'star gold' },
];

const VPhone = ({ children, status = '9:41' }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: V.bg,
      color: V.cream,
      fontFamily: V.fontB,
      borderRadius: 18,
      border: `1px solid ${V.creamLine}`,
      position: 'relative',
    }}
  >
    {/* iOS status bar */}
    <div style={{
      padding: '6px 16px 4px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: V.fontB, fontSize: 12, fontWeight: 600,
    }}>
      <span>{status}</span>
      <span style={{ fontSize: 10, opacity: 0.6 }}>● ● ●</span>
    </div>
    <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      {children}
    </div>
  </div>
);

const VCosmicBg = () => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: `
      radial-gradient(ellipse at 20% 25%, ${V.periGlow} 0%, transparent 60%),
      radial-gradient(ellipse at 80% 75%, rgba(220,130,95,0.10) 0%, transparent 60%),
      linear-gradient(180deg, ${V.bg} 0%, ${V.bg2} 100%)`,
  }} />
);

const VStars = ({ count = 18, seed = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
    {Array.from({ length: count }).map((_, i) => {
      const x = ((i * 67 + seed * 13) % 92) + 3;
      const y = ((i * 41 + seed * 17) % 96) + 2;
      const size = i % 5 === 0 ? 3 : 1.8;
      const color = i % 4 === 0 ? V.star : i % 3 === 0 ? V.peri : V.cream;
      return (
        <span key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: size, height: size, borderRadius: '50%',
          background: color, opacity: i % 3 === 0 ? 0.7 : 0.45,
        }} />
      );
    })}
  </div>
);

// Shared chrome ─────────────────────────────────────────────────────
const VLogo = ({ size = 22, sub }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
    <span style={{ fontFamily: V.fontD, fontSize: size, lineHeight: 1, letterSpacing: '-0.01em' }}>
      vein
    </span>
    {sub && (
      <span style={{ fontFamily: V.fontM, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: V.creamMuted }}>
        {sub}
      </span>
    )}
  </div>
);

const VMonoCap = ({ children, color = V.creamMuted, size = 9 }) => (
  <span style={{ fontFamily: V.fontM, fontSize: size, letterSpacing: '0.22em', textTransform: 'uppercase', color }}>
    {children}
  </span>
);

const VBtn = ({ children, primary = false, ghost = false, full = false, style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '10px 18px',
    fontFamily: V.fontM, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    fontWeight: 500,
    background: primary ? V.accent : 'transparent',
    color: primary ? V.cream : ghost ? V.accentSoft : V.cream,
    border: `1px solid ${primary ? V.accent : ghost ? V.accentSoft : V.creamMuted}`,
    outline: primary ? `1px solid ${V.accent}` : 'none',
    outlineOffset: 3,
    cursor: 'pointer',
    width: full ? '100%' : 'auto',
    ...style,
  }}>
    {primary && <span style={{ marginRight: 6 }}>★</span>}
    {children}
  </span>
);

const VPill = ({ children, tone = 'cream' }) => {
  const colorMap = {
    cream: V.creamMuted, accent: V.accent, star: V.star,
    peri: V.peri, error: V.error,
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      border: `1px solid ${colorMap[tone]}`, color: colorMap[tone],
      fontFamily: V.fontM, fontSize: 8.5, fontWeight: 500,
      letterSpacing: '0.2em', textTransform: 'uppercase', background: 'transparent',
    }}>
      {children}
    </span>
  );
};

// ── 1. LOGIN ──────────────────────────────────────────────────────
const VeinLogin = () => (
  <VPhone>
    <VCosmicBg />
    <VStars count={28} seed={1} />
    <div style={{ position: 'relative', zIndex: 1, padding: '40px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* wordmark */}
      <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
        {/* the star */}
        <span style={{
          display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
          background: V.peri, boxShadow: `0 0 24px ${V.peri}, 0 0 0 8px rgba(176,205,253,0.10)`,
          marginBottom: 18,
        }} />
        <div style={{ fontFamily: V.fontD, fontSize: 60, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          vein
        </div>
        <div style={{ fontFamily: V.fontD, fontStyle: 'italic', fontSize: 19, color: V.peri, marginTop: 10, lineHeight: 1.2, maxWidth: 240, marginLeft: 'auto', marginRight: 'auto' }}>
          for the 3am idea you forget by morning.
        </div>
        <VMonoCap size={9} color={V.creamFaint}>
          <div style={{ marginTop: 18 }}>— a tool from talia duvet</div>
        </VMonoCap>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
        <VBtn primary full>continue with google</VBtn>
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <VMonoCap color={V.creamFaint} size={8.5}>uses your drive · we never see your files</VMonoCap>
        </div>
      </div>
    </div>
  </VPhone>
);

// ── 2. LIBRARY ────────────────────────────────────────────────────
const VeinLibrary = () => (
  <VPhone>
    {/* top */}
    <div style={{
      padding: '14px 18px 10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: `1px solid ${V.creamLine}`,
    }}>
      <VLogo size={22} sub="library" />
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `1px solid ${V.creamLine}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: V.fontM, fontSize: 10, color: V.creamMuted,
      }}>j</span>
    </div>

    {/* actions row */}
    <div style={{ padding: '14px 18px 6px', display: 'flex', gap: 8 }}>
      <VBtn primary>record</VBtn>
      <VBtn>import</VBtn>
      <span style={{ marginLeft: 'auto', alignSelf: 'center' }}>
        <VMonoCap>3 unsynced</VMonoCap>
      </span>
    </div>

    {/* search */}
    <div style={{ padding: '6px 18px 0' }}>
      <div style={{
        padding: '9px 12px', background: 'rgba(20,23,49,0.6)',
        border: `1px solid ${V.creamLine}`, borderRadius: 8,
        fontFamily: V.fontB, fontSize: 13, color: V.creamFaint,
      }}>
        search titles, fragments, tags…
      </div>
    </div>

    {/* status filters */}
    <div style={{ padding: '10px 18px', display: 'flex', gap: 6, overflow: 'hidden' }}>
      {[['all', true], ['raw', false], ['marked', false], ['linked', false]].map(([l, on]) => (
        <span key={l} style={{
          padding: '4px 10px',
          fontFamily: V.fontM, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          border: `1px solid ${on ? V.peri : V.creamLine}`,
          color: on ? V.peri : V.creamMuted,
          background: on ? 'rgba(176,205,253,0.06)' : 'transparent',
          borderRadius: 999,
        }}>{l}</span>
      ))}
    </div>

    {/* group · raw */}
    <div style={{ padding: '4px 18px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
        <span style={{ fontFamily: V.fontD, fontSize: 22, letterSpacing: '-0.01em' }}>raw</span>
        <VMonoCap>(4)</VMonoCap>
      </div>
    </div>

    {/* memo items */}
    <div style={{ padding: '8px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { t: 'humming · the porch one', d: 'today · 3:14am', frags: 0, tags: [] },
        { t: 'bridge idea / piano loop', d: 'today · 12:48am', frags: 2, tags: ['mood: blue', 'inst: piano'] },
        { t: 'voice memo 0427', d: 'yesterday · 11:22pm', frags: 0, tags: [] },
        { t: 'walking — chorus shape', d: 'mon · 7:15pm', frags: 1, tags: ['fast'] },
      ].map((m, i) => (
        <div key={i} style={{
          padding: '12px 14px',
          background: 'rgba(20,23,49,0.55)',
          border: `1px solid ${V.creamLine}`,
          borderRadius: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: V.fontB, fontSize: 14, fontWeight: 500, color: V.cream }}>{m.t}</div>
              <div style={{ fontFamily: V.fontM, fontSize: 10.5, color: V.creamFaint, marginTop: 2 }}>{m.d}</div>
            </div>
            <VPill tone="cream">{m.frags ? 'marked' : 'raw'}</VPill>
          </div>
          {m.frags > 0 && (
            <div style={{ fontFamily: V.fontM, fontSize: 10, color: V.peri, marginTop: 6, letterSpacing: '0.04em' }}>
              ◆ {m.frags} fragment{m.frags !== 1 ? 's' : ''}
            </div>
          )}
          {m.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {m.tags.map(t => (
                <span key={t} style={{
                  padding: '1px 8px', fontFamily: V.fontM, fontSize: 9,
                  border: `1px solid ${V.creamLine}`, color: V.creamMuted, borderRadius: 999,
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>

    {/* bottom nav */}
    <div style={{
      position: 'sticky', bottom: 0,
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 0 14px', background: V.bg2,
      borderTop: `1px solid ${V.creamLine}`,
    }}>
      <span style={{ color: V.peri }}><VMonoCap color={V.peri} size={10}>library</VMonoCap></span>
      <span><VMonoCap size={10}>songs</VMonoCap></span>
    </div>
  </VPhone>
);

// ── 3. MEMO DETAIL ─────────────────────────────────────────────────
const VeinMemoDetail = () => (
  <VPhone>
    {/* top */}
    <div style={{
      padding: '12px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: `1px solid ${V.creamLine}`,
    }}>
      <VMonoCap>← library</VMonoCap>
      <VMonoCap>memo · saved 2s ago</VMonoCap>
    </div>

    {/* title */}
    <div style={{ padding: '16px 18px 8px' }}>
      <VMonoCap color={V.creamFaint}>— may 21 · 3:14am</VMonoCap>
      <div style={{ fontFamily: V.fontD, fontSize: 30, letterSpacing: '-0.01em', lineHeight: 1.05, marginTop: 4 }}>
        humming · the porch one
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <VPill tone="peri">marked</VPill>
        <VPill tone="cream">2 fragments</VPill>
        <VPill tone="cream">linked to "the porch"</VPill>
      </div>
    </div>

    {/* waveform */}
    <div style={{ padding: '6px 18px' }}>
      <div style={{
        height: 92, position: 'relative',
        background: 'rgba(20,23,49,0.55)',
        border: `1px solid ${V.creamLine}`, borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* fake waveform bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 12px', height: '100%' }}>
          {Array.from({ length: 56 }).map((_, i) => {
            const h = 8 + Math.abs(Math.sin(i * 0.7) * 38) + (i % 5 === 0 ? 8 : 0);
            return (
              <span key={i} style={{
                flex: 1, height: `${h}%`,
                background: i < 22 ? V.accent : V.creamMuted,
                opacity: i < 22 ? 1 : 0.4,
                borderRadius: 1,
              }} />
            );
          })}
        </div>
        {/* playhead */}
        <div style={{
          position: 'absolute', left: '40%', top: 0, bottom: 0, width: 1.5, background: V.peri,
          boxShadow: `0 0 12px ${V.peri}`,
        }} />
        {/* fragment markers */}
        <span style={{ position: 'absolute', left: '24%', top: 0, bottom: 0, width: 1, background: V.star }} />
        <span style={{ position: 'absolute', left: '62%', top: 0, bottom: 0, width: 1, background: V.star }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <VMonoCap color={V.creamFaint}>0:14</VMonoCap>
        <VMonoCap color={V.creamFaint}>0:36</VMonoCap>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <VBtn primary>▸ play</VBtn>
        <VBtn>+ fragment</VBtn>
        <span style={{ marginLeft: 'auto', alignSelf: 'center' }}><VMonoCap>1.0×</VMonoCap></span>
      </div>
    </div>

    {/* fragments */}
    <div style={{ padding: '14px 18px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <VMonoCap>— fragments</VMonoCap>
        <VMonoCap color={V.creamFaint}>2</VMonoCap>
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { t: 'melody · "the porch is humming"', s: '0:08', y: 'melody' },
          { t: 'lyric · "wait until the light dies"', s: '0:22', y: 'lyric' },
        ].map((f, i) => (
          <div key={i} style={{
            padding: '10px 12px', background: 'rgba(20,23,49,0.55)',
            border: `1px solid ${V.creamLine}`, borderRadius: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: V.fontM, fontSize: 10, color: V.star, letterSpacing: '0.15em', textTransform: 'uppercase' }}>◆ {f.s}</span>
              <VMonoCap color={V.creamFaint}>{f.y}</VMonoCap>
            </div>
            <div style={{ fontFamily: V.fontB, fontSize: 13, marginTop: 4, color: V.cream }}>
              {f.t}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* transcript */}
    <div style={{ padding: '14px 18px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <VMonoCap>— transcript</VMonoCap>
        <VMonoCap color={V.accentSoft}>retry whisper</VMonoCap>
      </div>
      <div style={{
        marginTop: 8, padding: 12,
        background: 'rgba(20,23,49,0.55)', border: `1px solid ${V.creamLine}`, borderRadius: 10,
        fontFamily: V.fontB, fontSize: 13, lineHeight: 1.5, color: V.creamMuted,
      }}>
        the porch is humming again, wait until the light dies, wait until the light dies…
      </div>
    </div>
  </VPhone>
);

// ── 4. RECORD ─────────────────────────────────────────────────────
const VeinRecord = () => (
  <VPhone>
    <VCosmicBg />
    <VStars count={18} seed={3} />
    <div style={{ position: 'relative', zIndex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <VMonoCap>× cancel</VMonoCap>
        <VLogo size={18} sub="recording" />
        <VMonoCap color={V.peri}>● live</VMonoCap>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        {/* pulsing dot */}
        <div style={{ position: 'relative' }}>
          <span style={{
            display: 'block', width: 18, height: 18, borderRadius: '50%',
            background: V.accent, boxShadow: `0 0 0 16px rgba(155,108,255,0.15), 0 0 0 32px rgba(155,108,255,0.06), 0 0 32px ${V.accent}`,
          }} />
        </div>
        {/* time */}
        <div style={{ fontFamily: V.fontM, fontSize: 52, color: V.accent, letterSpacing: '0.04em', fontWeight: 500 }}>
          00:42
        </div>
        <VMonoCap color={V.creamMuted}>recording…</VMonoCap>

        {/* live waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 56, width: '80%' }}>
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 12 + Math.abs(Math.sin((i + 5) * 0.6) * 40) + (i > 36 ? 20 : 0);
            return (
              <span key={i} style={{
                flex: 1, height: `${Math.min(95, h)}%`,
                background: i > 36 ? V.accent : V.creamMuted,
                opacity: i > 36 ? 1 : 0.5, borderRadius: 1,
              }} />
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
        <VBtn primary full>stop &amp; save</VBtn>
        <div style={{ textAlign: 'center' }}>
          <VMonoCap color={V.creamFaint}>uploads to vein/audio in your drive · ~10s</VMonoCap>
        </div>
      </div>
    </div>
  </VPhone>
);

// ── Accent picker — used in settings + onboarding ─────────────────
const VAccentPicker = ({ current = '#9b6cff', compact = false }) => (
  <div style={{ display: 'flex', gap: compact ? 8 : 12, flexWrap: 'wrap' }}>
    {VEIN_ACCENT_OPTIONS.map(opt => {
      const selected = opt.value === current;
      return (
        <div key={opt.name} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: compact ? 32 : 40, height: compact ? 32 : 40, borderRadius: '50%',
            background: opt.value,
            boxShadow: selected
              ? `0 0 0 2px ${V.bg}, 0 0 0 4px ${opt.value}, 0 0 20px ${opt.glow}`
              : `0 0 0 1px ${V.creamLine}`,
            cursor: 'pointer',
          }} />
          {!compact && (
            <span style={{
              fontFamily: V.fontM, fontSize: 8.5, letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: selected ? opt.value : V.creamFaint,
              fontWeight: selected ? 600 : 400,
            }}>{opt.name}</span>
          )}
        </div>
      );
    })}
  </div>
);

// ── 5. SETTINGS ────────────────────────────────────────────────────
const VeinSettings = () => (
  <VPhone>
    <div style={{
      padding: '12px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: `1px solid ${V.creamLine}`,
    }}>
      <VMonoCap>← library</VMonoCap>
      <VLogo size={18} sub="settings" />
      <VMonoCap color={V.creamFaint}>jamie@…</VMonoCap>
    </div>

    {/* make it yours · accent picker */}
    <div style={{ padding: '20px 18px 14px' }}>
      <VMonoCap>— make it yours</VMonoCap>
      <div style={{ fontFamily: V.fontD, fontSize: 28, letterSpacing: '-0.01em', lineHeight: 1.05, marginTop: 4 }}>
        pick your <span style={{ fontStyle: 'italic', color: V.accent }}>action color.</span>
      </div>
      <div style={{ fontFamily: V.fontB, fontSize: 13, color: V.creamMuted, marginTop: 6, lineHeight: 1.4 }}>
        this color carries you through vein — buttons, the play head, the recording light. not everyone identifies with violet.
      </div>

      <div style={{ marginTop: 18 }}>
        <VAccentPicker />
      </div>

      {/* live preview */}
      <div style={{
        marginTop: 18, padding: 14,
        background: 'rgba(20,23,49,0.55)',
        border: `1px solid ${V.creamLine}`, borderRadius: 12,
      }}>
        <VMonoCap color={V.creamFaint}>preview</VMonoCap>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            background: V.accent, boxShadow: `0 0 16px ${V.accentGlow}`,
          }} />
          <div style={{ fontFamily: V.fontM, fontSize: 11, color: V.accent }}>00:42</div>
          <div style={{ flex: 1, display: 'flex', gap: 2, height: 18, alignItems: 'center' }}>
            {Array.from({ length: 28 }).map((_, i) => {
              const h = 20 + Math.abs(Math.sin(i * 0.8) * 60);
              return <span key={i} style={{ flex: 1, height: `${h}%`, background: i < 12 ? V.accent : V.creamMuted, opacity: i < 12 ? 1 : 0.4, borderRadius: 1 }} />;
            })}
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <VBtn primary>▸ play</VBtn>
          <VBtn>+ fragment</VBtn>
        </div>
      </div>
    </div>

    {/* other settings rows */}
    <div style={{ padding: '6px 18px 24px' }}>
      <VMonoCap>— vault</VMonoCap>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['google drive', 'connected · jamie@gmail.com', '✓'],
          ['transcription', 'whisper · 84 of 100 used this month', '↻'],
          ['notifications', 'silent · only saves & sync errors', '·'],
          ['export catalog', 'download a json of your memos', '↓'],
          ['sign out', '', '→'],
        ].map(([t, sub, ic], i) => (
          <div key={i} style={{
            padding: '12px 14px',
            background: 'rgba(20,23,49,0.45)',
            border: `1px solid ${V.creamLine}`, borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: V.fontB, fontSize: 13.5, fontWeight: 500 }}>{t}</div>
              {sub && <div style={{ fontFamily: V.fontM, fontSize: 10, color: V.creamFaint, marginTop: 2, letterSpacing: '0.04em' }}>{sub}</div>}
            </div>
            <span style={{ color: V.creamMuted, fontSize: 14 }}>{ic}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <VMonoCap color={V.creamFaint}>vein v1.4 · talia duvet · vancouver</VMonoCap>
      </div>
    </div>
  </VPhone>
);

Object.assign(window, { VeinLogin, VeinLibrary, VeinMemoDetail, VeinRecord, VeinSettings, VAccentPicker, VEIN_ACCENT_OPTIONS });
