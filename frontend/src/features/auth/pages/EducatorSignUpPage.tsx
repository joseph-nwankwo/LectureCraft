import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lightbulb, Check, Sparkles, BookOpen, ClipboardCheck } from 'lucide-react'
import { authApi } from '@/lib/api/auth.api'
import { useAuth } from '@/app/providers/AuthProvider'
import { TextField } from '@/components/design-system/inputs/TextField'
import { PasswordField } from '@/components/design-system/inputs/PasswordField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: Sparkles,      text: 'Generate lecture notes, exams, and assignments with AI' },
  { icon: BookOpen,      text: 'Create and manage your own courses independently' },
  { icon: ClipboardCheck, text: 'Grade submissions and share feedback with your students' },
]

const ROLES = [
  { value: 'LECTURER',           label: 'Lecturer',            description: 'Full access to all teaching and AI tools' },
  { value: 'TEACHING_ASSISTANT', label: 'Teaching Assistant',  description: 'Support lecturers with grading and course content' },
] as const

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',    ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number',           ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const color =
    score === 0 ? 'bg-muted'
    : score === 1 ? 'bg-red-500'
    : score === 2 ? 'bg-amber-500'
    : 'bg-green-500'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? color : 'bg-muted')} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, ok }) => (
          <span key={label} className={cn('flex items-center gap-1 text-xs', ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
            <Check className={cn('h-3 w-3', ok ? 'opacity-100' : 'opacity-0')} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function EducatorSignUpPage() {
  useEffect(() => { document.title = 'Educator Sign Up — LectureCraft' }, [])

  const { login }   = useAuth()
  const navigate    = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    role:      'LECTURER' as 'LECTURER' | 'TEACHING_ASSISTANT',
    password:  '',
    confirm:   '',
  })
  const [error,     setError]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function upd(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  function validate() {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Full name is required'); return false }
    if (!form.email.includes('@')) { setError('Valid email is required'); return false }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return false }
    if (!/[A-Z]/.test(form.password)) { setError('Password must contain an uppercase letter'); return false }
    if (!/[0-9]/.test(form.password)) { setError('Password must contain a number'); return false }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return false }
    setError(''); return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    setError('')
    try {
      await authApi.register({
        name:     `${form.firstName.trim()} ${form.lastName.trim()}`,
        email:    form.email,
        password: form.password,
        role:     form.role,
      })
      await login(form.email, form.password)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left branding panel ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-primary/90 to-slate-900 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">LectureCraft</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance">
              Your Personal AI Teaching Workspace
            </h1>
            <p className="text-base text-white/70 leading-relaxed max-w-md text-balance">
              No institution required. Set up your own workspace, create courses, and start generating academic content in minutes.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <span className="text-sm text-white/80 leading-snug">{text}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            <p className="font-medium text-white/80 mb-1">Want institutional features?</p>
            <p>Register your university or college to unlock department management, student cohorts, academic sessions, and multi-staff collaboration.</p>
            <Link to={ROUTES.SIGN_UP} className="mt-2 inline-block text-white/90 underline underline-offset-2 hover:text-white">
              Register an institution instead →
            </Link>
          </div>
        </div>

        <blockquote className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm text-white/80 italic leading-relaxed">
            "I'm a private tutor and LectureCraft has completely changed how I prepare materials. I generate a full lesson plan in under two minutes."
          </p>
          <footer className="mt-3 text-xs text-white/50 font-medium">
            Emeka Eze · Independent Educator
          </footer>
        </blockquote>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Lightbulb className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold">LectureCraft</span>
        </div>

        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create your educator account</h2>
            <p className="text-sm text-muted-foreground">Personal workspace — no institution needed</p>
          </div>

          {error && <Alert variant="error" title="Sign-up failed" description={error} />}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="First name"
                value={form.firstName}
                onChange={upd('firstName')}
                placeholder="Ada"
                required
                disabled={isLoading}
              />
              <TextField
                label="Last name"
                value={form.lastName}
                onChange={upd('lastName')}
                placeholder="Okonkwo"
                required
                disabled={isLoading}
              />
            </div>

            <TextField
              label="Email address"
              type="email"
              value={form.email}
              onChange={upd('email')}
              placeholder="you@email.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />

            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                    disabled={isLoading}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
                      form.role === r.value
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-[#E2DDD6] bg-white text-foreground hover:border-primary/40',
                    )}
                  >
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{r.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <PasswordField
                label="Password"
                value={form.password}
                onChange={upd('password')}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              {form.password && <PasswordStrength password={form.password} />}
            </div>

            <PasswordField
              label="Confirm password"
              value={form.confirm}
              onChange={upd('confirm')}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />

            <Button type="submit" variant="primary" fullWidth loading={isLoading} loadingText="Creating account…">
              Create educator account
            </Button>
          </form>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Already have an account?{' '}
              <Link to={ROUTES.SIGN_IN} className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
            <p>
              Have a university or college?{' '}
              <Link to={ROUTES.SIGN_UP} className="font-medium text-primary hover:underline">Register your institution</Link>
            </p>
            <p>
              Are you a student?{' '}
              <Link to={ROUTES.STUDENT_SIGN_UP} className="font-medium text-primary hover:underline">Create a student account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
