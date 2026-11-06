import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { FileText, FileEdit, Globe, Hash, Package, Upload, Download, Plus, X } from 'lucide-react'
import { libraryApi, type ExportRecord, type ExportTemplate, type LibraryDocument } from '../../../lib/api/library.api'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string

async function authenticatedDownload(url: string, filename: string) {
  const token = localStorage.getItem('accessToken') ?? ''
  const fullUrl = url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`
  const res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const FORMAT_LABELS: Record<string, { label: string; icon: ReactNode }> = {
  pdf:      { label: 'PDF',           icon: <FileText className="h-4 w-4" /> },
  docx:     { label: 'Word (DOCX)',   icon: <FileEdit className="h-4 w-4" /> },
  html:     { label: 'HTML',          icon: <Globe className="h-4 w-4" /> },
  markdown: { label: 'Markdown',      icon: <Hash className="h-4 w-4" /> },
  txt:      { label: 'Plain Text',    icon: <FileText className="h-4 w-4" /> },
}

const STATUS_VARIANTS: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
}

function ExportRow({ record }: { record: ExportRecord }) {
  return (
    <article className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{FORMAT_LABELS[record.format]?.icon ?? <Package className="h-4 w-4" />}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{record.document.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {FORMAT_LABELS[record.format]?.label ?? record.format} · {new Date(record.createdAt).toLocaleString()}
        </p>
      </div>
      <Badge variant={STATUS_VARIANTS[record.status] ?? 'neutral'}>{record.status}</Badge>
      {record.status === 'COMPLETED' && record.fileUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void authenticatedDownload(record.fileUrl!, `export.${record.format}`)}
          aria-label={`Download ${record.document.title}`}
          title="Download export"
        ><Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span></Button>
      )}
    </article>
  )
}

function QuickExportPanel() {
  const [docId, setDocId] = useState('')
  const [format, setFormat] = useState('pdf')
  const [mode, setMode] = useState<'instant' | 'queue'>('instant')

  const { data: docsData } = useQuery({
    queryKey: ['library', { limit: 100 }],
    queryFn: () => libraryApi.list({ limit: 100 }),
  })
  const docs: LibraryDocument[] = (docsData as { data: LibraryDocument[] } | undefined)?.data ?? []

  const qc = useQueryClient()
  const queueMutation = useMutation({
    mutationFn: () => libraryApi.queueExport(docId, format),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['exports'] }),
    onError: () => alert('Failed to queue export. Please try again.'),
  })

  const handleInstantDownload = () => {
    if (!docId) return
    const url = libraryApi.downloadDocument(docId, format)
    void authenticatedDownload(url, `document.${format}`)
  }

  return (
    <section className="mb-8 rounded-lg border border-border bg-card p-5 shadow-card" aria-labelledby="quick-export-heading">
      <h2 id="quick-export-heading" className="mb-4 font-semibold text-foreground">Quick Export</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Document</label>
          <select value={docId} onChange={(e) => setDocId(e.target.value)}
            aria-label="Document to export"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Select document —</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            aria-label="Export format"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(FORMAT_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'instant' | 'queue')}
            aria-label="Export mode"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="instant">Instant Download</option>
            <option value="queue">Queue (async)</option>
          </select>
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        disabled={!docId || queueMutation.isPending}
        onClick={mode === 'instant' ? handleInstantDownload : () => queueMutation.mutate()}
      >
        {queueMutation.isPending ? 'Queuing…' : mode === 'instant' ? <><Download className="h-4 w-4" />Download Now</> : <><Upload className="h-4 w-4" />Queue Export</>}
      </Button>
    </section>
  )
}

function TemplatesSection() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data } = useQuery({
    queryKey: ['export-templates'],
    queryFn: () => libraryApi.listExportTemplates(),
  })
  const templates: ExportTemplate[] = (data as { data: ExportTemplate[] } | undefined)?.data ?? []

  const createMutation = useMutation({
    mutationFn: () => libraryApi.createExportTemplate({ name: newName }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['export-templates'] }); setCreating(false); setNewName('') },
    onError: () => alert('Failed to create template.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libraryApi.deleteExportTemplate(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['export-templates'] }),
    onError: () => alert('Failed to delete template.'),
  })

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Export Templates</h2>
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New template</Button>
      </div>

      {creating && (
        <div className="flex gap-2 mb-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name…"
            className="flex-1 border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none" />
          <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewName('') }}><X className="h-4 w-4" />Cancel</Button>
        </div>
      )}

      {templates.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">No custom templates. Documents use institution default formatting.</p>
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.category} {t.isDefault && '· Default'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id) }} className="text-destructive hover:text-destructive">Remove</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExportCenterPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['exports', page],
    queryFn: () => libraryApi.listExports(page),
  })

  const records: ExportRecord[] = (data as { data: ExportRecord[] } | undefined)?.data ?? []
  const totalPages: number = (data as { totalPages?: number } | undefined)?.totalPages ?? 1

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Export Center"
        description="Download documents in the formats your workflow needs."
        icon={<Upload className="h-5 w-5" />}
        className="mb-8"
      />

      <QuickExportPanel />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Export History</h2>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <EmptyState icon={<Upload className="h-7 w-7" />} title="No exports yet" description="Your generated export history will appear here." size="sm" />
      )}

      <div className="space-y-2">
        {records.map((r) => <ExportRow key={r.id} record={r} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">
            ← Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">
            Next →
          </button>
        </div>
      )}

      <TemplatesSection />
    </div>
  )
}
