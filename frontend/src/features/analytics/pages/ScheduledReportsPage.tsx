import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { type ReactNode } from 'react'
import { FileText, BarChart2, TrendingUp, FileEdit } from 'lucide-react'
import { analyticsApi, type ReportFrequency, type ReportFormat, type ScheduledReport } from '../../../lib/api/analytics.api'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

const FREQ_LABELS: Record<ReportFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly',
  SEMESTER: 'Semester', ACADEMIC_SESSION: 'Academic Session',
}

const FORMAT_ICONS: Record<ReportFormat, ReactNode> = {
  PDF:   <FileText className="h-3.5 w-3.5" />,
  CSV:   <BarChart2 className="h-3.5 w-3.5" />,
  EXCEL: <TrendingUp className="h-3.5 w-3.5" />,
  WORD:  <FileEdit className="h-3.5 w-3.5" />,
}

function ScheduledRow({ report, onToggle, onDelete }: {
  report: ScheduledReport
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 border-b border-border p-4 last:border-0 hover:bg-muted/20 sm:flex-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{report.name}</p>
          <Badge variant={report.isActive ? 'success' : 'neutral'}>{report.isActive ? 'Active' : 'Paused'}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
          <span>{FREQ_LABELS[report.frequency]}</span>
          <span>·</span>
          <span className="flex items-center gap-1">{FORMAT_ICONS[report.format]} {report.format}</span>
          <span>·</span>
          <span>{report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}</span>
          {report.template && <><span>·</span><span>{report.template.name}</span></>}
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          {report.lastRunAt && <span>Last: {format(new Date(report.lastRunAt), 'MMM d HH:mm')}</span>}
          {report.nextRunAt && <span>Next: {format(new Date(report.nextRunAt), 'MMM d HH:mm')}</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => onToggle(report.id, !report.isActive)}>{report.isActive ? 'Pause' : 'Resume'}</Button>
        <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete scheduled report?')) onDelete(report.id) }} className="text-destructive hover:text-destructive">Delete</Button>
      </div>
    </div>
  )
}

function CreateModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: Parameters<typeof analyticsApi.createScheduled>[0]) => void
}) {
  const [form, setForm] = useState({
    name: '',
    frequency: 'WEEKLY' as ReportFrequency,
    format: 'PDF' as ReportFormat,
    recipientsRaw: '',
    isActive: true,
  })

  const handleSubmit = () => {
    if (!form.name.trim() || !form.recipientsRaw.trim()) return
    const recipients = form.recipientsRaw.split(',').map((r) => r.trim()).filter(Boolean)
    onCreate({ name: form.name, frequency: form.frequency, format: form.format, recipients, isActive: form.isActive })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-lg mb-4">Schedule New Report</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Report Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekly Teaching Summary"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ReportFrequency }))}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none">
                {(Object.keys(FREQ_LABELS) as ReportFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Format</label>
              <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as ReportFormat }))}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none">
                {(['PDF', 'CSV'] as ReportFormat[]).map((f) => (
                  <option key={f} value={f}>{FORMAT_ICONS[f]} {f}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Recipients (comma-separated emails) *</label>
            <textarea value={form.recipientsRaw} onChange={(e) => setForm((f) => ({ ...f, recipientsRaw: e.target.value }))}
              placeholder="user@example.com, head@university.edu"
              rows={2} className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active immediately
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleSubmit} disabled={!form.name.trim() || !form.recipientsRaw.trim()}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            Schedule Report
          </button>
          <button onClick={onClose} className="border border-border py-2 px-4 rounded-lg text-sm hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function ScheduledReportsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => analyticsApi.listScheduled(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof analyticsApi.createScheduled>[0]) => analyticsApi.createScheduled(data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['scheduled-reports'] }); setShowCreate(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isActive: boolean } }) =>
      analyticsApi.updateScheduled(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => analyticsApi.deleteScheduled(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  })

  const active = reports.filter((r) => r.isActive)
  const paused = reports.filter((r) => !r.isActive)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Scheduled Reports" description={`${reports.length} scheduled · ${active.length} active`} icon={<FileText className="h-5 w-5" />} actions={<Button onClick={() => setShowCreate(true)}>+ New Schedule</Button>} className="mb-8" />

      {isLoading && <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {!isLoading && reports.length === 0 && (
        <EmptyState title="No scheduled reports" description="Schedule automatic reports to be emailed to your team" action={<Button onClick={() => setShowCreate(true)}>Schedule First Report</Button>} />
      )}

      {active.length > 0 && (
        <section className="bg-card border border-border rounded-lg overflow-hidden mb-4 shadow-card">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">Active ({active.length})</h2>
          </div>
          {active.map((r) => (
            <ScheduledRow key={r.id} report={r}
              onToggle={(id, isActive) => updateMutation.mutate({ id, data: { isActive } })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </section>
      )}

      {paused.length > 0 && (
        <section className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-muted-foreground">Paused ({paused.length})</h2>
          </div>
          {paused.map((r) => (
            <ScheduledRow key={r.id} report={r}
              onToggle={(id, isActive) => updateMutation.mutate({ id, data: { isActive } })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </section>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={(d) => createMutation.mutate(d)} />
      )}
    </div>
  )
}
