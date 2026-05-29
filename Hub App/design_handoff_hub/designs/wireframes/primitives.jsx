// Shared sketchy primitives for the Talia hub wireframes.
// Keep these visual: hand-drawn boxes, scribble lines, monospace
// annotations, one warm coral accent.

const W = {
  ink: '#1a1816',
  ink2: '#3d3833',
  paper: '#f6f2ea',
  paper2: '#efeae0',
  muted: '#8a8278',
  accent: '#e07a5f',
  accent2: '#c96442',
  cosmic: '#1c1f2e',
  star: '#f4d77a',
  sketch: '"Caveat", "Patrick Hand", cursive',
  mono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
};

// Inject font + base styles once
if (!document.getElementById('w-fonts')) {
  const link = document.createElement('link');
  link.id = 'w-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Instrument+Serif&display=swap';
  document.head.appendChild(link);
}

if (!document.getElementById('w-styles')) {
  const s = document.createElement('style');
  s.id = 'w-styles';
  s.textContent = `
    .wf-board { font-family: ${W.sans}; color: ${W.ink}; }
    .wf-sketch { font-family: ${W.sketch}; }
    .wf-mono { font-family: ${W.mono}; }
    .wf-paper { background: ${W.paper}; }
    .wf-box {
      border: 1.5px solid ${W.ink};
      border-radius: 6px 9px 5px 8px / 8px 5px 9px 6px;
      background: ${W.paper};
    }
    .wf-box-soft {
      border: 1.2px solid ${W.ink2};
      border-radius: 8px 11px 7px 10px / 10px 7px 11px 8px;
      background: ${W.paper};
    }
    .wf-box-dashed {
      border: 1.4px dashed ${W.ink2};
      border-radius: 6px 9px 5px 8px / 8px 5px 9px 6px;
      background: ${W.paper};
    }
    .wf-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px;
      border: 1.2px solid ${W.ink};
      border-radius: 999px;
      font-family: ${W.mono};
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${W.paper};
    }
    .wf-pill.accent { background: ${W.accent}; color: white; border-color: ${W.accent2}; }
    .wf-pill.live { background: #d3e4cd; border-color: #5a7a4e; color: #2a3a22; }
    .wf-pill.beta { background: #f5e3a3; border-color: #8a7530; color: #4a3d10; }
    .wf-pill.soon { background: #eee6d8; border-color: ${W.muted}; color: ${W.ink2}; }
    .wf-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px;
      border: 1.5px solid ${W.ink};
      border-radius: 5px 8px 4px 7px / 7px 4px 8px 5px;
      background: ${W.paper};
      font-family: ${W.sans};
      font-size: 12px;
      font-weight: 600;
      box-shadow: 2px 2px 0 ${W.ink};
    }
    .wf-btn.accent {
      background: ${W.accent};
      color: white;
      border-color: ${W.accent2};
      box-shadow: 2px 2px 0 ${W.accent2};
    }
    .wf-img-placeholder {
      background:
        repeating-linear-gradient(135deg,
          ${W.paper2} 0 8px,
          ${W.paper} 8px 16px);
      border: 1.4px solid ${W.ink2};
      border-radius: 4px 7px 3px 6px / 6px 3px 7px 4px;
      display: flex; align-items: center; justify-content: center;
      font-family: ${W.mono}; font-size: 10px; color: ${W.muted};
      text-align: center; padding: 8px;
    }
    .wf-arrow {
      font-family: ${W.sketch};
      color: ${W.accent2};
      font-size: 18px;
      font-weight: 700;
    }
    .wf-note {
      font-family: ${W.sketch};
      color: ${W.accent2};
      font-size: 17px;
      line-height: 1.1;
    }
    .wf-anno {
      font-family: ${W.mono};
      font-size: 9.5px;
      color: ${W.muted};
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .wf-line { background: ${W.ink2}; height: 1.2px; }
    .wf-scribble {
      background: ${W.ink2};
      height: 6px;
      border-radius: 2px;
      opacity: 0.7;
    }
    .wf-scribble.short { width: 40%; }
    .wf-scribble.med   { width: 65%; }
    .wf-scribble.long  { width: 88%; }
    .wf-scribble.thin  { height: 3px; opacity: 0.45; }
    .wf-tilt-l { transform: rotate(-0.4deg); }
    .wf-tilt-r { transform: rotate(0.4deg); }
  `;
  document.head.appendChild(s);
}

// ── Reusable bits ────────────────────────────────────────────────

const Scribble = ({ w = 'long', thin = false, style }) => (
  <div className={`wf-scribble ${w} ${thin ? 'thin' : ''}`} style={style} />
);

const TextLines = ({ count = 3, widths = ['long', 'med', 'short'], thin = false, gap = 6, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
    {Array.from({ length: count }).map((_, i) => (
      <Scribble key={i} w={widths[i] ?? 'long'} thin={thin} />
    ))}
  </div>
);

const ImgPlaceholder = ({ label = 'image', style, children }) => (
  <div className="wf-img-placeholder" style={style}>
    <span>{children ?? `[ ${label} ]`}</span>
  </div>
);

const Pill = ({ children, variant = '', style }) => (
  <span className={`wf-pill ${variant}`} style={style}>
    {children}
  </span>
);

const Btn = ({ children, accent = false, style }) => (
  <span className={`wf-btn ${accent ? 'accent' : ''}`} style={style}>
    {children}
  </span>
);

const Note = ({ children, style }) => (
  <div className="wf-note" style={style}>
    {children}
  </div>
);

const Anno = ({ children, style }) => (
  <div className="wf-anno" style={style}>
    {children}
  </div>
);

// Frame: outer artboard chrome with optional browser-bar
const Frame = ({ children, browser = true, label, style }) => (
  <div
    className="wf-board wf-paper"
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}
  >
    {browser && (
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderBottom: `1.2px solid ${W.ink2}`,
          background: W.paper2,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#d96b5f' }} />
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#e5b94d' }} />
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#7aa674' }} />
        <span
          style={{
            marginLeft: 12,
            padding: '3px 10px',
            border: `1px solid ${W.ink2}`,
            borderRadius: 4,
            fontFamily: W.mono,
            fontSize: 10,
            color: W.muted,
            flex: '0 1 auto',
          }}
        >
          {label ?? 'taliaduvet.com'}
        </span>
      </div>
    )}
    <div style={{ flex: '1 1 auto', overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  </div>
);

// "Star" dot for cosmic flavor in lo-fi
const Star = ({ size = 3, x, y, opacity = 0.7 }) => (
  <span
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: '50%',
      background: W.ink,
      opacity,
    }}
  />
);

Object.assign(window, {
  W,
  Scribble,
  TextLines,
  ImgPlaceholder,
  Pill,
  Btn,
  Note,
  Anno,
  Frame,
  Star,
});
