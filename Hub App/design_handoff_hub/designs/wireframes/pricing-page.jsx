// Pricing page · full rent-to-own deep dive
// Wire-fidelity: structure + hierarchy.

const PR_Nav = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 28px', borderBottom: `1px dashed ${W.ink2}` }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span className="wf-sketch" style={{ fontSize: 22, fontWeight: 700 }}>talia duvet</span>
      <Anno>tools · music · cycles</Anno>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Anno>tools</Anno><Anno>pricing</Anno><Anno>about</Anno>
      <Btn>sign in</Btn>
    </div>
  </div>
);

const PricingPage = () => (
  <Frame label="taliaduvet.com/pricing">
    <PR_Nav />
    <div style={{ overflow: 'auto', height: '100%' }}>

      {/* manifesto */}
      <div style={{ padding: '24px 28px 16px', textAlign: 'center' }}>
        <Anno>— how pricing works</Anno>
        <div className="wf-sketch" style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, marginTop: 6 }}>
          every tool is <span style={{ color: W.accent2 }}>yours,</span> eventually.
        </div>
        <Anno style={{ textTransform: 'none', marginTop: 8, color: W.ink2 }}>
          pay once if you can. rent if you can't. either way, you own it. no forever subscription.
        </Anno>
      </div>

      {/* 3-step explainer */}
      <div style={{ padding: '4px 28px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          ['01', 'pay once', 'one-time price. yours forever. all future updates included.'],
          ['02', 'or rent-to-own', 'pick a monthly amount. cancel anytime. each month subtracts from the price.'],
          ['03', 'after your timeline', 'you own it outright. payments stop. updates keep coming.'],
        ].map(([n, t, b]) => (
          <div key={n} className="wf-box" style={{ padding: 14 }}>
            <Anno style={{ color: W.accent2 }}>{n}</Anno>
            <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>{t}</div>
            <TextLines count={2} widths={['long', 'med']} style={{ marginTop: 8 }} />
            <Anno style={{ textTransform: 'none', marginTop: 6, color: W.ink2 }}>{b}</Anno>
          </div>
        ))}
      </div>

      {/* comparison table */}
      <div style={{ padding: '20px 28px 8px' }}>
        <Anno>— the three tools, side by side</Anno>
        <div className="wf-box" style={{ marginTop: 8, overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', borderBottom: `1px solid ${W.ink2}`, background: W.paper2 }}>
            <div style={{ padding: '10px 12px' }}><Anno>·</Anno></div>
            {['Vein', 'Ledger', 'Production'].map(n => (
              <div key={n} style={{ padding: '10px 12px', borderLeft: `1px dashed ${W.ink2}` }}>
                <div className="wf-sketch" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>

          {[
            ['status', ['live', 'beta', 'soon'], 'pill'],
            ['one-time', ['$300', '$34', 'tbd']],
            ['rent-to-own', ['from $12.50/mo · 1–24 mo', 'from $5/mo · 1–7 mo', 'early-access']],
            ['platforms', ['ios / web / pwa', 'web', 'web (planned)']],
            ['data lives in', ['your google drive', 'your account', '—']],
            ['free trial', ['7 days', 'free during beta', 'waitlist']],
            ['updates', ['included forever', 'included forever', 'included forever']],
          ].map(([k, vals, kind]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', borderBottom: `1px dashed ${W.ink2}` }}>
              <div style={{ padding: '10px 12px' }}><Anno>{k}</Anno></div>
              {vals.map((v, i) => (
                <div key={i} style={{ padding: '10px 12px', borderLeft: `1px dashed ${W.ink2}`, fontSize: 12.5, color: W.ink }}>
                  {kind === 'pill' ? <Pill variant={v}>{v}</Pill> : v}
                </div>
              ))}
            </div>
          ))}

          {/* CTA row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}>
            <div style={{ padding: '12px' }}><Anno>get it</Anno></div>
            <div style={{ padding: '12px', borderLeft: `1px dashed ${W.ink2}` }}><Btn accent>try free</Btn></div>
            <div style={{ padding: '12px', borderLeft: `1px dashed ${W.ink2}` }}><Btn accent>join beta</Btn></div>
            <div style={{ padding: '12px', borderLeft: `1px dashed ${W.ink2}` }}><Btn>waitlist</Btn></div>
          </div>
        </div>
      </div>

      {/* the math · pick your pace */}
      <div style={{ padding: '20px 28px 8px' }}>
        <Anno>— the math, for vein</Anno>
        <div className="wf-box-soft" style={{ marginTop: 8, padding: 14, display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 18 }}>
          {/* OPTION A · pay once */}
          <div>
            <Anno>option a · pay once</Anno>
            <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, marginTop: 4, lineHeight: 1 }}>$300</div>
            <Anno style={{ textTransform: 'none', color: W.ink2, marginTop: 4 }}>one payment. done. yours.</Anno>
            <div style={{ marginTop: 10, height: 8, background: W.accent, borderRadius: 4 }} />
            <Anno style={{ marginTop: 4 }}>100% owned · day 1</Anno>
          </div>

          {/* OPTION B · rent-to-own w/ duration picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Anno>option b · rent-to-own</Anno>
              <Anno style={{ color: W.muted }}>pick your pace</Anno>
            </div>

            {/* result row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
              <div>
                <Anno>monthly</Anno>
                <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>$25</div>
              </div>
              <div className="wf-sketch" style={{ fontSize: 18, color: W.muted }}>×</div>
              <div>
                <Anno>months</Anno>
                <div className="wf-sketch" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>12</div>
              </div>
              <div className="wf-sketch" style={{ fontSize: 18, color: W.muted }}>=</div>
              <div>
                <Anno>total</Anno>
                <div className="wf-sketch" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>$300</div>
              </div>
            </div>

            {/* duration slider */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Anno>shortest · 1 mo · $300/mo</Anno>
                <Anno>cap · 24 mo · $12.50/mo</Anno>
              </div>
              <div style={{ position: 'relative', height: 22, marginTop: 4 }}>
                {/* track */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, top: 9,
                  height: 4, background: W.paper2,
                  border: `1px solid ${W.ink2}`, borderRadius: 2,
                }} />
                {/* fill (up to thumb) */}
                <div style={{
                  position: 'absolute', left: 0, top: 9,
                  width: '46%', height: 4, background: W.accent,
                  border: `1px solid ${W.ink2}`, borderRadius: 2,
                }} />
                {/* tick marks */}
                {[0, 25, 50, 75, 100].map(p => (
                  <div key={p} style={{
                    position: 'absolute', left: `${p}%`, top: 6,
                    width: 1, height: 10, background: W.ink2, opacity: 0.5,
                  }} />
                ))}
                {/* thumb */}
                <div style={{
                  position: 'absolute', left: '46%', top: 0,
                  transform: 'translateX(-50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: W.paper, border: `2px solid ${W.ink}`,
                  boxShadow: `2px 2px 0 ${W.accent2}`,
                }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  ['3 mo', '$100/mo'],
                  ['6 mo', '$50/mo'],
                  ['12 mo', '$25/mo', true],
                  ['18 mo', '$16.67/mo'],
                  ['24 mo', '$12.50/mo'],
                ].map(([n, p, active]) => (
                  <div key={n} className={active ? 'wf-box' : 'wf-box-soft'} style={{
                    padding: '4px 10px',
                    background: active ? W.accent : W.paper,
                    color: active ? 'white' : W.ink2,
                    borderColor: active ? W.accent2 : W.ink2,
                  }}>
                    <Anno style={{ color: 'inherit', fontWeight: 600 }}>{n}</Anno>
                    <div style={{ fontFamily: W.mono, fontSize: 10, color: 'inherit' }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>

            <Anno style={{ textTransform: 'none', color: W.ink2, marginTop: 10 }}>
              from $5/mo · up to 24 months · change pace anytime · pay off early whenever
            </Anno>
          </div>
        </div>
      </div>

      {/* values strip */}
      <div style={{ padding: '20px 28px 8px' }}>
        <Anno>— why we do it like this</Anno>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
          {[
            ['no forever subscriptions.', 'if you keep paying, you should own more.'],
            ['rent if money is tight.', 'pay what you can, when you can.'],
            ['you own what you bought.', 'updates keep coming, payments stop.'],
          ].map(([t, b]) => (
            <div key={t} className="wf-box-dashed" style={{ padding: 12 }}>
              <div className="wf-sketch" style={{ fontSize: 18, fontWeight: 700, color: W.accent2, lineHeight: 1.1 }}>{t}</div>
              <Anno style={{ textTransform: 'none', marginTop: 6, color: W.ink2 }}>{b}</Anno>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '20px 28px 12px' }}>
        <Anno>— questions, answered</Anno>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            'how do i pick a duration · can i change it later?',
            'what if i cancel halfway through rent-to-own?',
            'can i convert rent-to-own to one-time later?',
            'what happens if you stop building a tool?',
            'do you offer student / artist discounts?',
            'is there a free tier?',
            'what about teams or labels?',
            'do you take cards from outside canada / us?',
            'why is vein more expensive than ledger?',
          ].map((q, i) => (
            <div key={i} className="wf-box-soft" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{q}</div>
              <Anno>+</Anno>
            </div>
          ))}
        </div>
      </div>

      {/* footer cta */}
      <div style={{ padding: '20px 28px 24px', textAlign: 'center' }}>
        <div className="wf-sketch" style={{ fontSize: 26, fontWeight: 700 }}>
          start with the one that fits today.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <Btn accent>try vein free</Btn>
          <Btn>join ledger beta</Btn>
          <Btn>get on production waitlist</Btn>
        </div>
      </div>

      <div style={{ padding: '12px 28px', borderTop: `1px dashed ${W.ink2}`, display: 'flex', justifyContent: 'space-between' }}>
        <Anno>© talia duvet · vancouver</Anno>
        <Anno>refund within 14d · email hello@taliaduvet.com</Anno>
      </div>
    </div>

    <Note style={{ position: 'absolute', right: 26, top: 80, transform: 'rotate(-3deg)', maxWidth: 160 }}>
      framing >> features.<br/>this page is the manifesto ✦
    </Note>
  </Frame>
);

window.PricingPage = PricingPage;
