import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    let unsubscribe: (() => void) | null = null

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/', { replace: true })
      } else {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            navigate('/', { replace: true })
          }
        })
        unsubscribe = () => subscription.unsubscribe()
        timeout = setTimeout(() => {
          subscription.unsubscribe()
          navigate('/sign-in?error=link-expired', { replace: true })
        }, 10_000)
      }
    })

    return () => {
      unsubscribe?.()
      if (timeout) clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-paper)' }}>
      <span className="t-mono-cap" style={{ color: 'var(--ink-muted)' }}>signing you in…</span>
    </div>
  )
}
