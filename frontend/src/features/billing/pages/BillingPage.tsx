import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Zap, Users, BookOpen, HardDrive, Download } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { ProgressBar } from '@/features/analytics/components/Charts'
import { ROUTES } from '@/constants/routes'
import { formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Badge } from '@/components/design-system/display/Badge'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

interface UsageEntry {
  metric: string; label: string; used: number; limit: number | null
  percentage: number; unlimited: boolean
}

interface UsageSummary {
  periodStart: string | null; periodEnd: string | null
  plan: { name: string; slug: string } | null
  metrics: Record<string, UsageEntry>
}

interface Subscription {
  id: string; status: string; currentPeriodStart: string; currentPeriodEnd: string
  trialEndsAt: string | null; autoRenew: boolean
  plan: { name: string; slug: string; price: string; billingCycle: string }
}

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'error' | 'neutral' | 'warning'> = {
  ACTIVE: 'success', TRIALING: 'info', PAST_DUE: 'error', CANCELLED: 'neutral', EXPIRED: 'neutral', PAUSED: 'warning',
}

const METRIC_ICON: Record<string, React.ReactNode> = {
  aiTokens: <Zap className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  courses: <BookOpen className="w-4 h-4" />,
  exports: <Download className="w-4 h-4" />,
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingApi.getSubscription(), billingApi.getUsageSummary()])
      .then(([subRes, usageRes]) => {
        setSubscription(subRes.data.data)
        setUsage(usageRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"><Skeleton className="h-10 w-64 rounded-lg" /><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-56 rounded-lg" /></div>

  const plan = subscription?.plan

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Billing & Subscription" description="Manage your plan, usage, and payment history." icon={<CreditCard className="h-5 w-5" />} actions={<Link to={ROUTES.BILLING_PLANS} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Upgrade Plan</Link>} />

      {/* Current Plan */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6" aria-labelledby="current-plan-heading">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <h2 id="current-plan-heading" className="text-xl font-semibold text-foreground">{plan?.name ?? 'No Plan'}</h2>
            </div>
          </div>
          {subscription && (
            <Badge variant={STATUS_VARIANT[subscription.status] ?? 'neutral'}>{subscription.status}</Badge>
          )}
        </div>

        {plan && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-semibold">${plan.price}/{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</p>
            </div>
            {subscription?.currentPeriodEnd && (
              <div>
                <p className="text-xs text-gray-500">Renews</p>
                <p className="font-semibold">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            )}
            {subscription?.trialEndsAt && (
              <div>
                <p className="text-xs text-gray-500">Trial ends</p>
                <p className="font-semibold text-blue-600">{formatDate(subscription.trialEndsAt)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Auto-renew</p>
              <p className="font-semibold">{subscription?.autoRenew ? 'On' : 'Off'}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link to={ROUTES.BILLING_INVOICES} className="text-sm text-primary hover:underline">
            View Invoices
          </Link>
          <span className="text-gray-300">|</span>
          <Link to={ROUTES.BILLING_PAYMENTS} className="text-sm text-primary hover:underline">
            Payment History
          </Link>
          {subscription?.status === 'ACTIVE' && (
            <>
              <span className="text-gray-300">|</span>
              <button type="button" className="text-sm text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={async () => {
                  if (!confirm('Cancel at end of period?')) return
                  await billingApi.cancelSubscription(false)
                  window.location.reload()
                }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </section>

      {/* Usage */}
      {usage && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Current Period Usage</h3>
            {usage.periodEnd && (
              <p className="text-xs text-gray-500">Resets {formatDate(usage.periodEnd)}</p>
            )}
          </div>
          <div className="space-y-4">
            {Object.entries(usage.metrics).map(([key, entry]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    {METRIC_ICON[key]}
                    <span>{entry.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {entry.unlimited ? 'Unlimited' : `${entry.used.toLocaleString()} / ${entry.limit?.toLocaleString()}`}
                  </span>
                </div>
                {!entry.unlimited && (
                  <ProgressBar value={entry.used} max={entry.limit ?? 1}
                    color={entry.percentage > 85 ? 'var(--error)' : entry.percentage > 60 ? 'var(--warning)' : 'var(--primary)'} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Plans', href: ROUTES.BILLING_PLANS, icon: <Zap className="w-5 h-5" /> },
          { label: 'Invoices', href: ROUTES.BILLING_INVOICES, icon: <CreditCard className="w-5 h-5" /> },
          { label: 'API Keys', href: ROUTES.BILLING_API_KEYS, icon: <HardDrive className="w-5 h-5" /> },
          { label: 'Usage', href: ROUTES.BILLING_USAGE, icon: <Download className="w-5 h-5" /> },
        ].map((item) => (
          <Link key={item.href} to={item.href}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-muted-foreground shadow-card transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
