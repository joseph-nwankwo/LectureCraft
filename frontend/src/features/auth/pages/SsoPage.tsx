import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/constants/routes'
import { apiClient } from '@/lib/api/client'

export default function SsoPage() {
  const navigate        = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    // The authorization code is delivered as an HttpOnly cookie by the backend
    // redirect — it never appears in the URL. We simply POST to exchange; the
    // browser sends the cookie automatically via the withCredentials setting.
    apiClient
      .post<{ tokens: { accessToken: string } }>('/auth/sso/exchange', {})
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
