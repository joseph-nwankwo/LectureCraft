import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/constants/routes'
import { apiClient } from '@/lib/api/client'

export default function SsoPage() {
  const [params]        = useSearchParams()
  const navigate        = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const code = params.get('code')

    if (!code) {
      navigate(ROUTES.SIGN_IN, { replace: true })
      return
    }

    // Remove the code from the URL immediately — it is single-use and must not
    // be bookmarked, shared, or replayed via browser history.
    window.history.replaceState({}, '', ROUTES.AUTH_SSO)

    apiClient
      .post<{ tokens: { accessToken: string } }>('/auth/sso/exchange', { code })
      .then(({ data }) => {
        // Only the short-lived access token is stored in localStorage.
        // The refresh token is set as an HttpOnly cookie by the backend.
        localStorage.setItem('accessToken', data.tokens.accessToken)
        return refreshUser()
      })
      .then(() => navigate(ROUTES.DASHBOARD, { replace: true }))
      .catch(() => navigate(ROUTES.SIGN_IN, { replace: true }))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
