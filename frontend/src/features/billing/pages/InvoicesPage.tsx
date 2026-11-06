import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

interface Invoice {
  id: string; invoiceNumber: string; amount: string; total: string
  currency: string; status: string; dueDate: string; paidAt: string | null
  createdAt: string
}

const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'neutral' | 'error'> = {
  PAID: 'success', OPEN: 'info', DRAFT: 'neutral', VOID: 'neutral', UNCOLLECTIBLE: 'error',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    billingApi.getInvoices({ page, limit: 20 })
      .then((res) => { setInvoices(res.data.items); setTotal(res.data.total) })
      .finally(() => setLoading(false))
  }, [page])

  async function handleDownload(invoice: Invoice) {
    setDownloading(invoice.id)
    try {
      const res = await billingApi.downloadInvoice(invoice.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = `invoice-${invoice.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Invoices" description="Review and download your billing invoices." icon={<FileText className="h-5 w-5" />} className="mb-8" />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-4 text-left font-semibold text-muted-foreground">Invoice #</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Date</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Due</th>
              <th className="p-4 text-right font-semibold text-muted-foreground">Amount</th>
              <th className="p-4 text-center font-semibold text-muted-foreground">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8"><Skeleton className="mx-auto h-6 w-40" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="p-4"><EmptyState icon={<FileText className="h-6 w-6" />} title="No invoices yet" description="Invoices will appear here after billing activity." size="sm" /></td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-4 font-mono text-foreground">{inv.invoiceNumber}</td>
                <td className="p-4 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                <td className="p-4 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                <td className="p-4 text-right font-medium text-foreground">{inv.currency} {Number(inv.total).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <Badge variant={STATUS_VARIANTS[inv.status] ?? 'neutral'}>{inv.status}</Badge>
                </td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(inv)}
                    disabled={downloading === inv.id}
                    aria-label={`Download invoice ${inv.invoiceNumber}`}>
                    <Download className="w-3.5 h-3.5" />
                    {downloading === inv.id ? '...' : 'PDF'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between border-t border-border p-4">
            <span className="text-sm text-muted-foreground">{total} invoices total</span>
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
