import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/constants/routes'

export default function SsoPage() {
  const [params]        = useSearchParams()
  const navigate        = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const at = params.get('at')
    const rt = params.get('rt')

    if (!at) {
      navigate(ROUTES.SIGN_IN, { replace: true })
      return
    }

    localStorage.setItem('accessToken', at)
    if (rt) localStorage.setItem('refreshToken', rt)
    // Remove tokens from URL immediately so they don't appear in history
    window.history.replaceState({}, '', ROUTES.AUTH_SSO)

    refreshUser()
      .then(() => navigate(ROUTES.DASHBOARD, { replace: true }))
      .catch(() => navigate(ROUTES.SIGN_IN, { replace: true }))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
