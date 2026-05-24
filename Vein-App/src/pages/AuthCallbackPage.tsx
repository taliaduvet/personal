import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCodeForTokens } from '@/lib/auth'
import { repairDriveVault } from '@/lib/drive'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finishing sign-in…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setMessage(`Google sign-in was cancelled or denied (${error}).`)
      return
    }

    if (!code) {
      setMessage('No authorization code received. Try signing in again.')
      return
    }

    ;(async () => {
      try {
        await exchangeCodeForTokens(code)
        setMessage('Setting up your Drive vault…')
        await repairDriveVault()
        navigate('/', { replace: true })
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Sign-in failed')
      }
    })()
  }, [navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-sm text-vein-muted">{message}</p>
    </div>
  )
}
