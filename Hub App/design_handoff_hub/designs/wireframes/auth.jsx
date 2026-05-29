// Sign-in + first-run onboarding (using Vein as the example).

const SignIn = () => (
  <Frame label="taliaduvet.com/sign-in">
    {/* cosmic-flavored top strip */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 28px', borderBottom: `1px dashed ${W.ink2}` }}>
      <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>talia duvet</span>
      <Anno>← back to tools</Anno>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>

      {/* form side */}
      <div style={{ padding: '36px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <Anno>— sign in</Anno>
        <div className="wf-sketch" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
          back to your <span style={{ color: W.accent2 }}>library.</span>
        </div>
        <Anno style={{ textTransform: 'none', color: W.ink2 }}>
          enter your email · we'll send a magic link. no password to remember.
        </Anno>

        {/* email field */}
        <div className="wf-box-soft" style={{ padding: '10px 12px', marginTop: 8 }}>
          <Anno>email</Anno>
          <div style={{ fontFamily: W.mono, fontSize: 14, color: W.muted, marginTop: 2 }}>you@studio.com</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn accent>send magic link</Btn>
          <Btn>or sign in with apple</Btn>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: W.ink2, opacity: 0.3 }} />
          <Anno>or</Anno>
          <div style={{ flex: 1, height: 1, background: W.ink2, opacity: 0.3 }} />
        </div>

        <div className="wf-box-dashed" style={{ padding: 12 }}>
          <Anno style={{ textTransform: 'none', color: W.ink2 }}>
            don't have an account yet?
          </Anno>
          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
            <Btn>buy a tool</Btn>
            <Btn>join a waitlist</Btn>
          </div>
        </div>

        <Anno style={{ textTransform: 'none', color: W.muted, marginTop: 14 }}>
          we never share your email. we barely email you ourselves.
        </Anno>
      </div>

      {/* poster side */}
      <div style={{
        background: W.cosmic,
        color: W.paper,
        padding: 32,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* stars */}
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: ((i * 67) % 380) + 16,
            top: ((i * 43) % 520) + 16,
            width: i % 5 === 0 ? 4 : 2,
            height: i % 5 === 0 ? 4 : 2,
            borderRadius: '50%',
            background: i % 3 === 0 ? W.star : W.paper,
            opacity: 0.7,
          }} />
        ))}
        <Anno style={{ color: W.paper2, position: 'relative' }}>— tools from a working artist</Anno>
        <div style={{ position: 'relative' }}>
          <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.05 }}>
            "healing isn't a straight line.<br/>
            <span style={{ color: W.accent }}>neither is making things."</span>
          </div>
          <Anno style={{ marginTop: 10, color: W.paper2 }}>— talia, vancouver · spring 2026</Anno>
        </div>
        <Note style={{ position: 'absolute', top: 26, right: 22, color: W.accent, transform: 'rotate(-3deg)' }}>
          one account ·<br/>three tools
        </Note>
      </div>
    </div>
  </Frame>
);

// ── Onboarding flow · 4 steps shown as a single artboard with progress
const OnboardStep = ({ n, total, title, body, children, active = false }) => (
  <div className={active ? 'wf-box' : 'wf-box-soft'} style={{ padding: 14, background: active ? W.paper : W.paper2, opacity: active ? 1 : 0.65 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Anno style={{ color: active ? W.accent2 : W.muted }}>step {n} / {total}</Anno>
      {!active && <Anno>· · ·</Anno>}
    </div>
    <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>{title}</div>
    {body && <Anno style={{ textTransform: 'none', marginTop: 4, color: W.ink2 }}>{body}</Anno>}
    {children && <div style={{ marginTop: 8 }}>{children}</div>}
  </div>
);

const Onboarding = () => (
  <Frame label="vein.taliaduvet.com/welcome">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: `1px dashed ${W.ink2}` }}>
      <span className="wf-sketch" style={{ fontSize: 20, fontWeight: 700 }}>talia duvet / vein</span>
      <Anno>skip setup →</Anno>
    </div>

    <div style={{ padding: '20px 28px', overflow: 'auto', height: '100%' }}>

      {/* welcome */}
      <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
        <Anno>— first-run setup</Anno>
        <div className="wf-sketch" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>
          welcome to <span style={{ color: W.accent2 }}>Vein.</span>
        </div>
        <Anno style={{ textTransform: 'none', color: W.ink2, marginTop: 4 }}>
          5 small things and you're ready to capture. ~2 minutes.
        </Anno>
        {/* progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              width: i === 2 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= 2 ? W.accent : W.paper2,
              border: `1px solid ${W.ink2}`,
            }} />
          ))}
        </div>
      </div>

      {/* 4 steps stacked */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        <OnboardStep n={1} total={5} title="say hi" body="what name should we use?">
          <div className="wf-box-soft" style={{ padding: 8, background: W.paper }}>
            <Anno>name</Anno>
            <div style={{ fontFamily: W.mono, fontSize: 14, color: W.ink2, marginTop: 2 }}>jamie</div>
          </div>
          <Anno style={{ textTransform: 'none', marginTop: 6, color: W.muted }}>✓ done</Anno>
        </OnboardStep>

        <OnboardStep n={2} total={5} title="connect your drive" body="vein stores audio in your google drive · we never see your files." active>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn accent>connect google drive</Btn>
            <Btn>use local storage</Btn>
          </div>
          <Anno style={{ textTransform: 'none', marginTop: 8, color: W.muted }}>
            → opens drive auth in a new tab. comes back here.
          </Anno>
        </OnboardStep>

        <OnboardStep n={3} total={5} title="mic check" body="we'll record 3 seconds to make sure it works.">
          <div className="wf-box-dashed" style={{ padding: 14, textAlign: 'center' }}>
            <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, color: W.accent2 }}>● record</div>
            <Anno>tap to test</Anno>
          </div>
        </OnboardStep>

        <OnboardStep n={4} total={5} title="install on home screen" body="vein works best as a PWA — one tap to capture from anywhere.">
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn>install on ios</Btn>
            <Btn>install on android</Btn>
            <Btn>skip</Btn>
          </div>
        </OnboardStep>

        <OnboardStep n={5} total={5} title="make it yours" body="pick the color that carries you through vein — buttons, playhead, recording light.">
          {/* color swatches */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {[
              ['violet · house', '#9b6cff', true],
              ['periwinkle',    '#b0cdfd'],
              ['mauve',         '#b198b1'],
              ['peach',         '#fbcb94'],
              ['sage',          '#8bcba6'],
              ['gold',          '#fcd47a'],
            ].map(([n, c, active]) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: c,
                  border: active ? `2px solid ${W.ink}` : `1px solid ${W.ink2}`,
                  boxShadow: active ? `2px 2px 0 ${c}` : 'none',
                }} />
                <Anno style={{ color: active ? W.ink : W.muted, fontSize: 8, fontWeight: active ? 700 : 400 }}>
                  {n}
                </Anno>
              </div>
            ))}
          </div>
          <Anno style={{ textTransform: 'none', marginTop: 8, color: W.muted }}>
            change it any time in settings.
          </Anno>
        </OnboardStep>
      </div>

      {/* footer nav */}
      <div style={{
        marginTop: 20,
        padding: '14px 0 4px',
        borderTop: `1px dashed ${W.ink2}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Btn>← back</Btn>
        <Anno>you can change all of this later in settings</Anno>
        <Btn accent>continue →</Btn>
      </div>

      <Note style={{ marginTop: 16, textAlign: 'center', color: W.accent2, fontSize: 15 }}>
        the onboarding is short on purpose. captures should start in &lt; 2 min.
      </Note>
    </div>
  </Frame>
);

Object.assign(window, { SignIn, Onboarding });
