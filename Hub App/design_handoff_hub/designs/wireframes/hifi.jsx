// Hi-fi brand taste — Cosmic / Cycles-inspired customer hub.
// Applied to the constellation direction so Talia can feel where the
// wires could land. NOT a final design — a vibe sample.

const HifiTaste = () => {
  const stars = React.useMemo(
    () =>
      Array.from({ length: 80 }).map(() => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.5 + 0.4,
        o: Math.random() * 0.7 + 0.2,
      })),
    [],
  );

  const COSMIC = {
    bg: '#0c0e1a',
    bg2: '#141731',
    fog: 'rgba(120, 90, 200, 0.18)',
    fog2: 'rgba(220, 130, 95, 0.14)',
    ink: '#f6f0e3',
    ink2: 'rgba(246,240,227,0.65)',
    muted: 'rgba(246,240,227,0.4)',
    accent: '#e07a5f',
    star: '#fcd47a',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `radial-gradient(ellipse at 20% 30%, ${COSMIC.fog} 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 70%, ${COSMIC.fog2} 0%, transparent 55%),
                     linear-gradient(180deg, ${COSMIC.bg} 0%, ${COSMIC.bg2} 100%)`,
        color: COSMIC.ink,
        fontFamily: W.sans,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Star field */}
      {stars.map((st, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            borderRadius: '50%',
            background: COSMIC.star,
            opacity: st.o,
            boxShadow: `0 0 ${st.s * 2}px ${COSMIC.star}`,
          }}
        />
      ))}

      {/* Header */}
      <div
        style={{
          position: 'relative',
          padding: '24px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span
            style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 26,
              letterSpacing: '0.02em',
            }}
          >
            talia<span style={{ color: COSMIC.accent }}>·</span>duvet
          </span>
          <span
            style={{
              fontFamily: W.mono,
              fontSize: 10.5,
              color: COSMIC.muted,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            tools / studio
          </span>
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {['music', 'cycles', 'tools', 'about'].map((l, i) => (
            <span
              key={l}
              style={{
                fontFamily: W.mono,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: i === 2 ? COSMIC.ink : COSMIC.ink2,
                borderBottom: i === 2 ? `1px solid ${COSMIC.accent}` : 'none',
                paddingBottom: 4,
              }}
            >
              {l}
            </span>
          ))}
          <span
            style={{
              padding: '8px 18px',
              border: `1px solid ${COSMIC.accent}`,
              borderRadius: 999,
              fontFamily: W.mono,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: COSMIC.accent,
            }}
          >
            sign in
          </span>
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          textAlign: 'center',
          padding: '40px 60px 32px',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontFamily: W.mono,
            fontSize: 11,
            color: COSMIC.muted,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          ── tools from a working artist ──
        </div>
        <h1
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontWeight: 400,
            fontSize: 76,
            lineHeight: 0.98,
            margin: 0,
            letterSpacing: '-0.015em',
          }}
        >
          healing isn't a straight line.<br />
          <span style={{ fontStyle: 'italic', color: COSMIC.accent }}>
            neither is making things.
          </span>
        </h1>
        <p
          style={{
            fontFamily: W.sans,
            fontSize: 15,
            fontWeight: 400,
            color: COSMIC.ink2,
            marginTop: 22,
            maxWidth: 540,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.5,
          }}
        >
          a small suite of software built between songs, for solo artists, neurodivergent
          creatives, and everyone else still trying. one‑time purchase. rent‑to‑own if
          money's tight.
        </p>
      </div>

      {/* Constellation of products */}
      <div
        style={{
          position: 'relative',
          height: 260,
          margin: '0 60px',
        }}
      >
        {/* dashed orbit line connecting products */}
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
        >
          <path
            d="M 120 140 Q 280 60, 460 130 T 860 110"
            stroke={COSMIC.ink2}
            strokeWidth="1"
            strokeDasharray="3 5"
            fill="none"
            opacity="0.5"
          />
        </svg>

        {[
          {
            x: '12%', y: 100, name: 'Vein', tag: 'voice memo vault',
            phase: 'I · isolation', status: 'live', fill: true,
          },
          {
            x: '46%', y: 90,  name: 'Ledger', tag: 'sole-prop accounting',
            phase: 'II · agency', status: 'beta', fill: false,
          },
          {
            x: '80%', y: 80,  name: 'Production', tag: 'co-producer pocket app',
            phase: 'III · denial', status: 'soon', fill: false,
          },
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
              gap: 10,
              cursor: 'pointer',
            }}
          >
            {/* star */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: p.fill ? COSMIC.accent : 'transparent',
                border: `1.5px solid ${p.fill ? COSMIC.accent : COSMIC.star}`,
                boxShadow: p.fill
                  ? `0 0 24px ${COSMIC.accent}, 0 0 0 6px rgba(224,122,95,0.12)`
                  : `0 0 16px ${COSMIC.star}`,
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: W.mono,
                  fontSize: 9.5,
                  color: COSMIC.muted,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {p.phase}
              </div>
              <div
                style={{
                  fontFamily: '"Instrument Serif", serif',
                  fontSize: 32,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontFamily: W.sans,
                  fontSize: 12,
                  color: COSMIC.ink2,
                  marginTop: 4,
                }}
              >
                {p.tag}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '3px 10px',
                  fontFamily: W.mono,
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  borderRadius: 999,
                  border: `1px solid ${
                    p.status === 'live'
                      ? COSMIC.accent
                      : p.status === 'beta'
                      ? COSMIC.star
                      : COSMIC.muted
                  }`,
                  color:
                    p.status === 'live'
                      ? COSMIC.accent
                      : p.status === 'beta'
                      ? COSMIC.star
                      : COSMIC.muted,
                }}
              >
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid rgba(246,240,227,0.08)`,
          background: 'rgba(12,14,26,0.6)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          style={{
            fontFamily: W.mono,
            fontSize: 10,
            color: COSMIC.muted,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          shelf 01 / vol. spring 2026 — backed by creative bc
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['spotify', 'instagram', 'press kit', 'rss'].map(l => (
            <span
              key={l}
              style={{
                fontFamily: W.mono,
                fontSize: 10,
                color: COSMIC.ink2,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              ↗ {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HifiTaste });
