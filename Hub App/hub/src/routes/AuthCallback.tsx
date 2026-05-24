import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/', { replace: true })
      } else {
        // session exchange is still in progress — wait for the auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            subscription.unsubscribe()
            navigate('/', { replace: true })
          }
        })
        // if nothing happens in 10s, something went wrong
        const timeout = setTimeout(() => {
          subscription.unsubscribe()
          navigate('/sign-in?error=link-expired', { replace: true })
        }, 10_000)
        return () => {
          clearTimeout(timeout)
          subscription.unsubscribe()
        }
      }
    })
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-paper)' }}>
      <span className="t-mono-cap" style={{ color: 'var(--ink-muted)' }}>signing you in…</span>
    </div>
  )
}
