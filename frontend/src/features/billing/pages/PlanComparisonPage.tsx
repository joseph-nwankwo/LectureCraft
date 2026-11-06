import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Zap } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { ROUTES } from '@/constants/routes'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

interface Plan {
  id: string; name: string; slug: string; price: string; currency: string
  billingCycle: string; description: string | null; maxUsers: number | null
  maxCourses: number | null; maxStorageGB: number | null; monthlyGenerations: number | null
  apiAccess: boolean; prioritySupport: boolean; customBranding: boolean; ssoEnabled: boolean
}

const FEATURES = [
  { key: 'maxUsers', label: 'Users', fmt: (v: number | null) => v === null ? 'Unlimited' : String(v) },
  { key: 'maxCourses', label: 'Courses', fmt: (v: number | null) => v === null ? 'Unlimited' : String(v) },
  { key: 'maxStorageGB', label: 'Storage', fmt: (v: number | null) => v === null ? 'Unlimited' : `${v} GB` },
  { key: 'monthlyGenerations', label: 'AI Generations/mo', fmt: (v: number | null) => v === null ? 'Unlimited' : v.toLocaleString() },
  { key: 'apiAccess', label: 'API Access', fmt: (v: boolean) => v },
  { key: 'prioritySupport', label: 'Priority Support', fmt: (v: boolean) => v },
  { key: 'customBranding', label: 'Custom Branding', fmt: (v: boolean) => v },
  { key: 'ssoEnabled', label: 'SSO', fmt: (v: boolean) => v },
]

const PLAN_COLORS: Record<string, string> = {
  free: 'border-gray-200',
  starter: 'border-blue-300',
  professional: 'border-primary ring-2 ring-primary',
  enterprise: 'border-purple-400',
}

export default function PlanComparisonPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentSub, setCurrentSub] = useState<{ plan: { slug: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [coupon, setCoupon] = useState('')

  useEffect(() => {
    Promise.all([billingApi.getPlans(), billingApi.getSubscription().catch(() => ({ data: { data: null } }))])
      .then(([plansRes, subRes]) => {
        setPlans(plansRes.data.data)
        setCurrentSub(subRes.data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(plan: Plan) {
    setSelecting(plan.id)
    try {
      if (currentSub) {
        await billingApi.upgradeSubscription({ planId: plan.id, prorate: true })
      } else {
        await billingApi.createSubscription({ planId: plan.id, couponCode: coupon || undefined })
      }
      navigate(ROUTES.BILLING)
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to select plan')
    } finally {
      setSelecting(null)
    }
  }

  if (loading) return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"><Skeleton className="mx-auto h-10 w-64 rounded-lg" /><div className="grid grid-cols-1 gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 rounded-lg" />)}</div></div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Choose Your Plan" description="Start free. Upgrade as you grow." icon={<Zap className="h-5 w-5" />} className="mb-8 text-center" />

      {/* Coupon */}
      <div className="flex justify-center mb-8">
        <div className="flex w-full max-w-sm gap-2">
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            aria-label="Coupon code"
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {plans.map((plan) => {
          const isCurrent = currentSub?.plan.slug === plan.slug
          return (
            <article key={plan.id}
              className={`relative flex flex-col rounded-lg border-2 bg-card p-6 shadow-card ${PLAN_COLORS[plan.slug] ?? 'border-border'} ${plan.slug === 'professional' ? 'ring-2 ring-primary' : ''}`}>
              {plan.slug === 'professional' && (
                <Badge variant="primary" className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 min-h-[40px] text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.currency} {plan.price}</span>
                <span className="text-sm text-muted-foreground">/{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
              </div>
              <Button
                type="button"
                variant={isCurrent ? 'secondary' : plan.slug === 'professional' ? 'primary' : 'outline'}
                disabled={isCurrent || selecting === plan.id}
                onClick={() => handleSelect(plan)}
                className="mt-auto w-full"
              >
                {isCurrent ? 'Current Plan' : selecting === plan.id ? 'Processing...' : plan.price === '0' ? 'Get Started' : 'Select'}
              </Button>
            </article>
          )
        })}
      </div>

      {/* Feature comparison table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="p-4 text-left font-semibold text-muted-foreground">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="p-4 text-center font-semibold text-muted-foreground">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature, i) => (
              <tr key={feature.key} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                <td className="p-4 text-foreground">{feature.label}</td>
                {plans.map((plan) => {
                  const val = (plan as unknown as Record<string, unknown>)[feature.key]
                  const formatted = feature.fmt(val as never)
                  return (
                    <td key={plan.id} className="p-4 text-center">
                      {typeof formatted === 'boolean'
                        ? (formatted ? <Check aria-label="Included" className="mx-auto h-4 w-4 text-success" /> : <X aria-label="Not included" className="mx-auto h-4 w-4 text-muted-foreground" />)
                        : <span className="text-foreground">{formatted}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
