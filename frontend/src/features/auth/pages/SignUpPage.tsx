import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lightbulb, Building2, User, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { authApi } from '@/lib/api/auth.api'
import { useAuth } from '@/app/providers/AuthProvider'
import { TextField } from '@/components/design-system/inputs/TextField'
import { PasswordField } from '@/components/design-system/inputs/PasswordField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Institution',  icon: Building2 },
  { id: 2, label: 'Your Account', icon: User },
]

interface InstitutionData { name: string; country: string; timezone: string; domain: string }
interface OwnerData       { firstName: string; lastName: string; email: string; password: string; confirm: string }

const defaultInstitution: InstitutionData = { name: '', country: '', timezone: '', domain: '' }
const defaultOwner: OwnerData             = { firstName: '', lastName: '', email: '', password: '', confirm: '' }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',     ok: password.length >= 8 },
    { label: 'Uppercase letter',  ok: /[A-Z]/.test(password) },
    { label: 'Number',            ok: /[0-9]/.test(password) },
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
          <span
            key={label}
            className={cn('flex items-center gap-1 text-xs', ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}
          >
            <Check className={cn('h-3 w-3', ok ? 'opacity-100' : 'opacity-0')} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  useEffect(() => { document.title = 'Register Your Institution — LectureCraft' }, [])

  const { login }     = useAuth()
  const navigate      = useNavigate()
  const [step,        setStep]        = useState(1)
  const [institution, setInstitution] = useState<InstitutionData>(defaultInstitution)
  const [owner,       setOwner]       = useState<OwnerData>(defaultOwner)
  const [error,       setError]       = useState('')
  const [isLoading,   setIsLoading]   = useState(false)

  function updInst(field: keyof InstitutionData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setInstitution((p) => ({ ...p, [field]: e.target.value }))
  }
  function updOwner(field: keyof OwnerData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setOwner((p) => ({ ...p, [field]: e.target.value }))
  }

  function validateStep1() {
    if (!institution.name.trim()) { setError('Institution name is required'); return false }
    setError(''); return true
  }

  function validateStep2() {
    if (!owner.firstName.trim() || !owner.lastName.trim()) { setError('Full name is required'); return false }
    if (!owner.email.includes('@')) { setError('Valid email required'); return false }
    if (owner.password.length < 8) { setError('Password must be at least 8 characters'); return false }
    if (!/[A-Z]/.test(owner.password)) { setError('Password must contain an uppercase letter'); return false }
    if (!/[0-9]/.test(owner.password)) { setError('Password must contain a number'); return false }
    if (owner.password !== owner.confirm) { setError('Passwords do not match'); return false }
    setError(''); return true
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep2()) return
    setIsLoading(true)
    setError('')
    try {
      await authApi.registerInstitution({
        institution: {
          name:     institution.name,
          country:  institution.country || undefined,
          timezone: institution.timezone || undefined,
          domain:   institution.domain || undefined,
        },
        owner: {
          firstName: owner.firstName,
          lastName:  owner.lastName,
          email:     owner.email,
          password:  owner.password,
        },
      })
      await login(owner.email, owner.password)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-120 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to={ROUTES.SIGN_IN} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Lightbulb className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">LectureCraft</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Register your institution</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your team's AI-powered academic workspace</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (s.id < step) setStep(s.id) }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                  step === s.id ? 'bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2'
                  : step > s.id ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground',
                )}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </button>
              <span className={cn('text-sm font-medium', step === s.id ? 'text-foreground' : 'text-muted-foreground')}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          {error && <Alert variant="error" description={error} />}

          {step === 1 && (
            <div className="space-y-4">
              <TextField
                label="Institution / University name"
                value={institution.name}
                onChange={updInst('name')}
                placeholder="e.g. University of Lagos"
                required
              />
              <TextField
                label="Domain (optional)"
                value={institution.domain}
                onChange={updInst('domain')}
                placeholder="unilag.edu.ng"
                hint="Used to auto-verify staff emails"
              />
              <TextField label="Country (optional)" value={institution.country} onChange={updInst('country')} placeholder="Nigeria" />
              <TextField label="Timezone (optional)" value={institution.timezone} onChange={updInst('timezone')} placeholder="Africa/Lagos" />
              <Button variant="primary" fullWidth onClick={handleNext} rightIcon={<ChevronRight className="h-4 w-4" />}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="First name" value={owner.firstName} onChange={updOwner('firstName')} placeholder="Ada" required disabled={isLoading} />
                <TextField label="Last name" value={owner.lastName} onChange={updOwner('lastName')} placeholder="Okonkwo" required disabled={isLoading} />
              </div>
              <TextField
                label="Work email"
                type="email"
                value={owner.email}
                onChange={updOwner('email')}
                placeholder="you@institution.edu"
                autoComplete="email"
                required
                disabled={isLoading}
              />
              <div>
                <PasswordField
                  label="Password"
                  value={owner.password}
                  onChange={updOwner('password')}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
                {owner.password && <PasswordStrength password={owner.password} />}
              </div>
              <PasswordField
                label="Confirm password"
                value={owner.confirm}
                onChange={updOwner('confirm')}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setStep(1)} leftIcon={<ChevronLeft className="h-4 w-4" />} className="flex-none">
                  Back
                </Button>
                <Button type="submit" variant="primary" fullWidth loading={isLoading} loadingText="Creating account…">
                  Create institution
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.SIGN_IN} className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
