import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ── Thin wrapper that unwraps axios responses — used by library/assessment APIs ──
export const client = {
  get:    <T>(url: string)                => apiClient.get<T>(url).then((r) => r.data),
  post:   <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data),
  put:    <T>(url: string, body?: unknown) => apiClient.put<T>(url, body).then((r) => r.data),
  delete: <T>(url: string)                => apiClient.delete<T>(url).then((r) => r.data),
}

// ── Attach access token to every request ──────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Refresh token on 401, retry original request once ─────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return apiClient(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      // The refresh token is an HttpOnly cookie — the browser sends it
      // automatically because withCredentials:true is set on apiClient.
      // A legacy localStorage token is sent as a fallback body param for
      // sessions created before the cookie-based flow was introduced.
      const legacyRt = localStorage.getItem('refreshToken')
      const { data } = await axios.post<{ status: string; tokens?: { accessToken: string } }>(
        `${BASE_URL}/auth/refresh`,
        legacyRt ? { refreshToken: legacyRt } : {},
        { withCredentials: true }
      )

      const newAt = data.tokens?.accessToken
      if (!newAt) throw new Error('No access token in refresh response')

      localStorage.setItem('accessToken', newAt)
      // Legacy RT no longer needed — backend now manages it via cookie.
      localStorage.removeItem('refreshToken')
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAt}`

      processQueue(null, newAt)
      original.headers.Authorization = `Bearer ${newAt}`
      return apiClient(original)
    } catch (refreshError) {
      processQueue(refreshError)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/sign-in'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
