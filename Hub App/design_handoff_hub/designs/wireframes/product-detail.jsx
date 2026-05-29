// Product detail pages — Vein, Ledger, Production.
// Public marketing pages, one level deeper than the homepage card.
// Wire-fidelity: structure + hierarchy, not pixel-perfect.

// ── Shared chrome ──────────────────────────────────────────────────
const PD_Nav = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 28px',
      borderBottom: `1px dashed ${W.ink2}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>talia duvet</span>
      <Anno>tools · music · cycles</Anno>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Anno>← all tools</Anno>
      <Btn>sign in</Btn>
    </div>
  </div>
);

const PD_Breadcrumb = ({ name }) => (
  <div style={{ padding: '10px 28px 0' }}>
    <Anno>tools <span style={{ color: W.muted }}>/</span> {name.toLowerCase()}</Anno>
  </div>
);

const PD_Hero = ({ name, soul, tag, status, phase, accent }) => (
  <div style={{ padding: '20px 28px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
    <div>
      <Anno style={{ color: accent ?? W.accent2 }}>{phase}</Anno>
      <div className="wf-sketch" style={{ fontSize: 52, fontWeight: 700, lineHeight: 0.95, marginTop: 4 }}>
        {name}
      </div>
      <Anno style={{ textTransform: 'none', fontStyle: 'italic', marginTop: 4 }}>{tag}</Anno>
      <div className="wf-sketch" style={{ fontSize: 20, color: W.accent2, marginTop: 12, lineHeight: 1.15 }}>
        {soul}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Btn accent>try free</Btn>
        <Btn>see pricing ↓</Btn>
        <Pill variant={status}>{status}</Pill>
      </div>
    </div>
    <ImgPlaceholder label="hero shot · app screen" style={{ height: 220 }} />
  </div>
);

const PD_FeatureRow = ({ title, body, side = 'left', imgLabel = 'screen' }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: side === 'left' ? '0.9fr 1.1fr' : '1.1fr 0.9fr',
      gap: 20,
      padding: '16px 28px',
      alignItems: 'center',
    }}
  >
    {side === 'left' ? (
      <>
        <div>
          <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05 }}>
            {title}
          </div>
          <TextLines count={3} style={{ marginTop: 8 }} />
        </div>
        <ImgPlaceholder label={imgLabel} style={{ height: 140 }} />
      </>
    ) : (
      <>
        <ImgPlaceholder label={imgLabel} style={{ height: 140 }} />
        <div>
          <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05 }}>
            {title}
          </div>
          <TextLines count={3} style={{ marginTop: 8 }} />
        </div>
      </>
    )}
  </div>
);

const PD_Pricing = ({ price, r2o, status }) => (
  <div style={{ padding: '20px 28px', borderTop: `1px dashed ${W.ink2}`, borderBottom: `1px dashed ${W.ink2}` }}>
    <Anno>— pricing</Anno>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
      <div className="wf-box-soft" style={{ padding: 12 }}>
        <Anno>one-time</Anno>
        <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{price}</div>
        <Anno style={{ textTransform: 'none', marginTop: 4 }}>buy outright · yours forever</Anno>
      </div>
      <div className="wf-box-soft" style={{ padding: 12 }}>
        <Anno>rent-to-own</Anno>
        <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{r2o}</div>
        <Anno style={{ textTransform: 'none', marginTop: 4 }}>pick your pace · 24 mo cap · change anytime</Anno>
      </div>
    </div>
    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
      <Btn accent>{status === 'soon' ? 'join waitlist' : status === 'beta' ? 'join beta' : 'try free'}</Btn>
      <Btn>how pricing works →</Btn>
    </div>
  </div>
);

const PD_FAQ = ({ faqs }) => (
  <div style={{ padding: '18px 28px' }}>
    <Anno>— questions</Anno>
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {faqs.map((q, i) => (
        <div key={i} className="wf-box-soft" style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: W.ink }}>{q}</div>
            <Anno>+</Anno>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PD_Footer = () => (
  <div style={{ padding: '14px 28px', borderTop: `1px dashed ${W.ink2}`, display: 'flex', justifyContent: 'space-between' }}>
    <Anno>© talia duvet · vancouver</Anno>
    <Anno>music · cycles · tools · contact</Anno>
  </div>
);

// ── VEIN ───────────────────────────────────────────────────────────
const VeinDetail = () => (
  <Frame label="taliaduvet.com/tools/vein">
    <PD_Nav />
    <div style={{ overflow: 'auto', height: '100%' }}>
      <PD_Breadcrumb name="Vein" />
      <PD_Hero
        name="Vein"
        phase="phase i · isolation"
        tag="a voice-memo vault for solo artists"
        status="live"
        soul={'for the 3am idea you forget by morning.'}
      />
      <div style={{ padding: '8px 28px' }}>
        <Anno>— what it does</Anno>
        <TextLines count={2} widths={['long', 'med']} style={{ marginTop: 6 }} />
      </div>
      <PD_FeatureRow
        title="capture without thinking"
        body=""
        side="left"
        imgLabel="record button · waveform"
      />
      <PD_FeatureRow
        title="fragments, not files"
        body=""
        side="right"
        imgLabel="mark in/out · fragment chip"
      />
      <PD_FeatureRow
        title="whisper transcribe, on your terms"
        body=""
        side="left"
        imgLabel="transcript + sync"
      />
      <PD_FeatureRow
        title="your drive. your files. forever."
        body=""
        side="right"
        imgLabel="drive sync diagram"
      />

      <div style={{ padding: '8px 28px' }}>
        <Anno>— in your hand</Anno>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 8 }}>
          {['ios', 'android', 'web', 'pwa offline'].map(p => (
            <div key={p} className="wf-box-soft" style={{ padding: '10px 12px', textAlign: 'center' }}>
              <Anno>{p}</Anno>
            </div>
          ))}
        </div>
      </div>

      <PD_Pricing price="$300" r2o="1–24 months · from $12.50/mo" status="live" />

      <div style={{ padding: '14px 28px' }}>
        <Anno>— what artists are saying</Anno>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          {[1, 2].map(i => (
            <div key={i} className="wf-box-soft" style={{ padding: 12 }}>
              <Note style={{ fontSize: 14 }}>"{'\u2014 quote · 1 sentence · 1 artist'}"</Note>
              <Anno style={{ marginTop: 6 }}>— first name, role</Anno>
            </div>
          ))}
        </div>
      </div>

      <PD_FAQ faqs={[
        'do my recordings ever leave my drive?',
        'what if i run out of transcription credits?',
        'can i export my fragments?',
        'how does rent-to-own actually work?',
      ]} />

      <PD_Footer />
    </div>
  </Frame>
);

// ── LEDGER ─────────────────────────────────────────────────────────
const LedgerDetail = () => (
  <Frame label="taliaduvet.com/tools/ledger">
    <PD_Nav />
    <div style={{ overflow: 'auto', height: '100%' }}>
      <PD_Breadcrumb name="Ledger" />
      <PD_Hero
        name="Ledger"
        phase="phase ii · agency"
        tag="sole-prop accounting · canada · with feeling"
        status="beta"
        soul="for taking the wheel back from a shoebox of receipts."
      />

      <div style={{ padding: '8px 28px' }}>
        <Anno>— what it does</Anno>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 6 }}>
          {[
            ['T2125-shaped books', 'every row already maps to a CRA line.'],
            ['GST, per province', 'set your rate once. it shows up everywhere.'],
            ['Wealthsimple-ready', 'export, paste, file. no surprise math.'],
          ].map(([t, b]) => (
            <div key={t} className="wf-box-soft" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
              <Anno style={{ textTransform: 'none', marginTop: 4, color: W.ink2 }}>{b}</Anno>
            </div>
          ))}
        </div>
      </div>

      <PD_FeatureRow title="bookkeeping that doesn't punish you" side="left" imgLabel="books table · T2125 categories" />
      <PD_FeatureRow title="two people, two books, one app" side="right" imgLabel="user switcher" />
      <PD_FeatureRow title="receipt? snap it. done." side="left" imgLabel="receipt capture" />
      <PD_FeatureRow title="year-end is a button" side="right" imgLabel="export to wealthsimple" />

      <PD_Pricing price="$34 once" r2o="1–7 months · from $5/mo" status="beta" />

      <div style={{ padding: '14px 28px' }}>
        <Anno>— who it's for</Anno>
        <TextLines count={2} style={{ marginTop: 6 }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {['canadian sole-prop', 'musicians', 'designers', 'freelancers w/ chaos'].map(c => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>
      </div>

      <PD_FAQ faqs={[
        'is this actual CRA-compliant or just close enough?',
        'what about HST provinces?',
        'do you support multi-currency?',
        'how is data stored?',
      ]} />

      <PD_Footer />
    </div>
  </Frame>
);

// ── PRODUCTION ─────────────────────────────────────────────────────
const ProductionDetail = () => (
  <Frame label="taliaduvet.com/tools/production">
    <PD_Nav />
    <div style={{ overflow: 'auto', height: '100%' }}>
      <PD_Breadcrumb name="Production" />
      <PD_Hero
        name="Production"
        phase="phase iii · denial"
        tag="a co-producer in your pocket"
        status="soon"
        soul="for when you can't tell if the kick is the problem."
      />

      <div style={{ padding: '8px 28px' }}>
        <Anno>— what it'll be</Anno>
        <TextLines count={3} widths={['long', 'long', 'med']} style={{ marginTop: 6 }} />
      </div>

      <PD_FeatureRow title="prompts at decision points" side="left" imgLabel="prompt card · session" />
      <PD_FeatureRow title="your reference library, on tap" side="right" imgLabel="ref grid" />
      <PD_FeatureRow title="mentor mode — for when you need an ear" side="left" imgLabel="conversation panel" />

      <div style={{ padding: '14px 28px' }}>
        <Anno>— still sketching</Anno>
        <div className="wf-box-dashed" style={{ padding: 14, marginTop: 8 }}>
          <Note style={{ fontSize: 15 }}>
            "we're still figuring out what this is. the waitlist gets early access + helps shape it."
          </Note>
        </div>
      </div>

      <PD_Pricing price="tbd" r2o="early-access pricing" status="soon" />

      <PD_FAQ faqs={[
        'when?',
        'is this an ai thing?',
        'will it work with my DAW?',
        'how do i get on the waitlist?',
      ]} />

      <PD_Footer />
    </div>
  </Frame>
);

Object.assign(window, { VeinDetail, LedgerDetail, ProductionDetail });
