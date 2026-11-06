import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { ProgressBar, BarChart } from '@/features/analytics/components/Charts'
import { formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
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

interface HistoryRecord { metric: string; value: string; recordedAt: string }

export default function UsageAnalyticsPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingApi.getUsageSummary(), billingApi.getUsageHistory({ limit: 60 })])
      .then(([sumRes, histRes]) => { setSummary(sumRes.data.data); setHistory(histRes.data.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"><Skeleton className="h-10 w-64 rounded-lg" /><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Skeleton className="h-28 rounded-lg" /><Skeleton className="h-28 rounded-lg" /></div></div>
  if (!summary) return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><EmptyState icon={<Activity className="h-7 w-7" />} title="No usage data" description="Usage information is not available yet." /></div>

  const aiTokenHistory = history
    .filter((r) => r.metric === 'AI_TOKENS')
    .slice(0, 12)
    .reverse()
    .map((r) => ({ name: formatDate(r.recordedAt, 'MMM d'), value: Number(r.value) }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Usage Analytics" description="Track usage against the limits included with your plan." icon={<Activity className="h-5 w-5" />} actions={summary.periodEnd ? <p className="text-sm text-muted-foreground">Period ends {formatDate(summary.periodEnd)}</p> : undefined} className="mb-8" />
      {/* Plan info */}
      {summary.plan && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Badge variant="primary">{summary.plan.name}</Badge>
          <span>{summary.periodStart ? `${formatDate(summary.periodStart)} – ${formatDate(summary.periodEnd!)}` : ''}</span>
        </div>
      )}

      {/* Metric bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Object.entries(summary.metrics).map(([key, entry]) => (
          <div key={key} className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">{entry.label}</span>
              <span className="text-muted-foreground">
                {entry.unlimited ? 'Unlimited' : `${entry.used.toLocaleString()} / ${entry.limit?.toLocaleString()}`}
              </span>
            </div>
            {!entry.unlimited && (
              <>
                <ProgressBar value={entry.used} max={entry.limit ?? 1}
                  color={entry.percentage > 85 ? '#ef4444' : entry.percentage > 60 ? '#f59e0b' : '#6366f1'} />
                <p className="mt-1 text-xs text-muted-foreground">{entry.percentage}% used</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* AI token history chart */}
      {aiTokenHistory.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="mb-4 font-semibold text-foreground">AI Token Usage History</h2>
          <BarChart
            data={aiTokenHistory}
            dataKey="value"
            xKey="name"
            color="#6366f1"
            height={200}
          />
        </div>
      )}
    </div>
  )
}
