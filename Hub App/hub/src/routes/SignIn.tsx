import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import './SignIn.css'

type State = 'idle' | 'sending' | 'sent' | 'error'

const CALLBACK = `${window.location.origin}/auth/callback`

// deterministic star field — same layout every render
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 67) % 380) + 16,
  y: ((i * 43) % 520) + 16,
  size: i % 5 === 0 ? 4 : 2,
  gold: i % 3 === 0,
}))

export default function SignIn() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!loading && session) return <Navigate to="/" replace />

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('sending')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: CALLBACK },
    })

    if (error) {
      setState('error')
      setErrorMsg('something went wrong sending the link. try again in a moment.')
    } else {
      setState('sent')
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: CALLBACK },
    })
  }

  return (
    <div className="signin-shell surface-paper">
      {/* top bar */}
      <header className="signin-topbar">
        <span className="t-display" style={{ fontSize: 'var(--text-xl)' }}>talia duvet</span>
      </header>

      <div className="signin-body">
        {/* ── left: form ── */}
        <section className="signin-form-side">
          {state === 'sent' ? (
            <SentState email={email} onResend={() => setState('idle')} />
          ) : (
            <FormState
              email={email}
              setEmail={setEmail}
              state={state}
              errorMsg={errorMsg}
              onSubmit={sendMagicLink}
              onGoogle={signInWithGoogle}
            />
          )}
        </section>

        {/* ── right: cosmic poster ── */}
        <section className="signin-poster surface-cosmic">
          {STARS.map((s, i) => (
            <span
              key={i}
              className="signin-star"
              style={{
                left: s.x,
                top: s.y,
                width: s.size,
                height: s.size,
                background: s.gold ? 'var(--star)' : 'var(--cream)',
              }}
            />
          ))}

          <p className="t-mono-cap signin-poster-eyebrow">— tools from a working artist</p>

          <blockquote className="signin-poster-quote">
            <span className="t-display">"healing isn't a straight line.</span>
            <br />
            <span className="t-display" style={{ color: 'var(--accent-soft)' }}>neither is making things."</span>
            <footer className="t-mono-cap signin-poster-attr">— talia, vancouver · spring 2026</footer>
          </blockquote>

          <p className="t-mono-cap signin-poster-note">one account · three tools</p>
        </section>
      </div>
    </div>
  )
}

function FormState({
  email, setEmail, state, errorMsg, onSubmit, onGoogle,
}: {
  email: string
  setEmail: (v: string) => void
  state: State
  errorMsg: string
  onSubmit: (e: FormEvent) => void
  onGoogle: () => void
}) {
  return (
    <>
      <p className="t-mono-cap" style={{ color: 'var(--ink-muted)', marginBottom: 'var(--space-3)' }}>— sign in</p>

      <h1 className="t-display signin-heading">
        back to your{' '}
        <span style={{ color: 'var(--accent)' }}>library.</span>
      </h1>

      <p style={{ color: 'var(--ink-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
        enter your email · we'll send a magic link. no password to remember.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div>
          <label className="t-mono-cap" style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--ink-muted)', fontSize: 10 }}>
            email
          </label>
          <input
            className="input"
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        {errorMsg && (
          <p style={{ color: 'var(--negative)', fontSize: 'var(--text-sm)' }}>{errorMsg}</p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
            {state === 'sending' ? 'sending…' : 'send magic link'}
          </button>
          <button type="button" className="btn" onClick={onGoogle}>
            sign in with google
          </button>
        </div>
      </form>

      <div className="signin-rule" style={{ margin: 'var(--space-5) 0' }}>
        <div className="rule">
          <span className="t-mono-cap" style={{ fontSize: 10 }}>or</span>
        </div>
      </div>

      <div style={{ border: '1px dashed var(--ink-faint)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
        <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
          don't have an account yet?
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <a href="https://taliaduvet.com" className="btn" style={{ fontSize: 10 }}>buy a tool</a>
          <a href="https://taliaduvet.com" className="btn" style={{ fontSize: 10 }}>join a waitlist</a>
        </div>
      </div>

      <p style={{ marginTop: 'var(--space-6)', color: 'var(--ink-faint)', fontSize: 'var(--text-xs)' }}>
        we never share your email. we barely email you ourselves.
      </p>
    </>
  )
}

function SentState({ email, onResend }: { email: string; onResend: () => void }) {
  return (
    <>
      <p className="t-mono-cap" style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)' }}>— link sent</p>

      <h1 className="t-display signin-heading">check your inbox.</h1>

      <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
        sent to <strong style={{ color: 'var(--ink)' }}>{email}</strong>
      </p>
      <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
        the link expires in 15 minutes. tap it in your email and you're in.
      </p>

      <div style={{ border: '1px solid var(--ink-faint)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)' }}>didn't get it? check spam, or —</p>
        <button className="btn" onClick={onResend} style={{ alignSelf: 'flex-start' }}>try a different email</button>
      </div>
    </>
  )
}
