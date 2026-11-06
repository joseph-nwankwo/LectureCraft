import { useEffect, useState } from 'react'
import { Key, Plus, RefreshCw, Trash2, Copy, Check } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

interface APIKey {
  id: string; name: string; keyPrefix: string; scopes: string[]
  active: boolean; lastUsedAt: string | null; createdAt: string
}

interface NewKey { rawKey: string; apiKey: APIKey }

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealed, setRevealed] = useState<NewKey | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () => {
    setLoading(true)
    billingApi.getApiKeys()
      .then((res) => setKeys(res.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await billingApi.generateApiKey({ name: newKeyName })
      setRevealed(res.data)
      setNewKeyName('')
      load()
    } catch { alert('Failed to generate key') }
    finally { setCreating(false) }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key?')) return
    await billingApi.revokeApiKey(id)
    load()
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate this key? The existing key will stop working immediately.')) return
    const res = await billingApi.rotateApiKey(id)
    setRevealed(res.data)
    load()
  }

  function copyKey() {
    if (revealed?.rawKey) {
      navigator.clipboard.writeText(revealed.rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="API Keys" description="Manage programmatic access to your LectureSuite account." icon={<Key className="h-5 w-5" />} className="mb-8" />

      {/* Revealed key alert */}
      {revealed && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning-muted p-4" role="alert">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            Save this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded border border-warning/30 bg-background px-3 py-2 text-xs font-mono text-foreground">
              {revealed.rawKey}
            </code>
            <button type="button" onClick={copyKey} aria-label="Copy new API key" title="Copy API key"
              className="flex-none rounded-md p-2 text-warning-foreground hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
            </button>
          </div>
          <button onClick={() => setRevealed(null)} className="mt-2 text-xs text-amber-600 hover:underline">
            I've saved it
          </button>
        </div>
      )}

      {/* Create form */}
      <section className="mb-6 rounded-lg border border-border bg-card p-4 shadow-card" aria-labelledby="create-key-heading">
        <h2 id="create-key-heading" className="mb-3 text-sm font-semibold text-foreground">Create New API Key</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production, CI)"
            aria-label="API key name"
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()} loading={creating} loadingText="Generating…"><Plus className="h-4 w-4" />Generate</Button>
        </div>
      </section>

      {/* Keys list */}
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-4 text-left font-semibold text-muted-foreground">Name</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Prefix</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Last Used</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Created</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8"><Skeleton className="mx-auto h-6 w-40" /></td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={5} className="p-4"><EmptyState icon={<Key className="h-6 w-6" />} title="No API keys yet" description="Create a key when you need programmatic access." size="sm" /></td></tr>
            ) : keys.filter((k) => k.active).map((key) => (
              <tr key={key.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">{key.name}</td>
                <td className="p-4 font-mono text-xs text-muted-foreground"><Badge variant="neutral">{key.keyPrefix}...</Badge></td>
                <td className="p-4 text-muted-foreground">{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}</td>
                <td className="p-4 text-muted-foreground">{formatDate(key.createdAt)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button type="button" onClick={() => handleRotate(key.id)} aria-label={`Rotate ${key.name}`} title="Rotate key"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleRevoke(key.id)} aria-label={`Revoke ${key.name}`} title="Revoke key"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  )
}
