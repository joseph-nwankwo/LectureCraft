import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { Button } from '@/components/design-system/buttons/Button'

interface Payment {
  id: string; amount: string; currency: string; status: string
  paymentProvider: string; transactionReference: string | null
  createdAt: string; invoice?: { invoiceNumber: string }
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  SUCCEEDED: 'success', PENDING: 'warning', FAILED: 'error', REFUNDED: 'info', CANCELLED: 'neutral',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    billingApi.getPayments({ page, limit: 20 })
      .then((res) => { setPayments(res.data.items); setTotal(res.data.total) })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Payment History" description="Review completed, pending, and failed billing transactions." icon={<CreditCard className="h-5 w-5" />} className="mb-8" />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-4 text-left font-semibold text-muted-foreground">Date</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Invoice</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Provider</th>
              <th className="p-4 text-right font-semibold text-muted-foreground">Amount</th>
              <th className="p-4 text-center font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8"><Skeleton className="mx-auto h-6 w-40" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={5} className="p-4"><EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payments yet" description="Payment activity will appear here." size="sm" /></td></tr>
            ) : payments.map((pmt) => (
              <tr key={pmt.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-4 text-muted-foreground">{formatDate(pmt.createdAt)}</td>
                <td className="p-4 font-mono text-xs text-foreground">{pmt.invoice?.invoiceNumber ?? '—'}</td>
                <td className="p-4 capitalize text-muted-foreground">{pmt.paymentProvider.toLowerCase()}</td>
                <td className="p-4 text-right font-medium text-foreground">{pmt.currency} {Number(pmt.amount).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <Badge variant={STATUS_VARIANTS[pmt.status] ?? 'neutral'}>{pmt.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between border-t border-border p-4">
            <span className="text-sm text-muted-foreground">{total} payments total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
