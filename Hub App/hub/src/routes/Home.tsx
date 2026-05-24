import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Home.css'

export default function Home() {
  const { session } = useAuth()

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="home-shell surface-paper">
      <header className="home-topbar">
        <span className="t-display" style={{ fontSize: 'var(--text-xl)' }}>talia duvet</span>
        <button className="btn" onClick={signOut} style={{ fontSize: 10 }}>sign out</button>
      </header>

      <main className="home-main">
        <p className="t-mono-cap" style={{ color: 'var(--ink-muted)', marginBottom: 'var(--space-3)' }}>— your hub</p>
        <h1 className="t-display" style={{ fontSize: 'var(--text-2xl)', margin: '0 0 var(--space-3)' }}>
          welcome back{session?.user.email ? `, ${session.user.email.split('@')[0]}` : ''}.
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)' }}>
          your tools, downloads, and billing will all live here. this page is coming in the next build.
        </p>
      </main>
    </div>
  )
}
