import { useState, useMemo } from 'react'
import {
  Search,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Mail,
  ArrowRightLeft,
  XCircle,
} from 'lucide-react'
import { useSyncPreview, useSyncCampaigns, useSyncPush } from '../../hooks/useSync'
import type { SyncContact } from '../../types'

export default function SyncTab() {
  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = useSyncPreview()
  const { data: campaigns, isLoading: campaignsLoading } = useSyncCampaigns()
  const pushMutation = useSyncPush()

  const [search, setSearch] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [campaignId, setCampaignId] = useState('')
  const [showResult, setShowResult] = useState(false)

  const missing = preview?.missing_contacts || []

  const filtered = useMemo(() => {
    if (!search) return missing
    const q = search.toLowerCase()
    return missing.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    )
  }, [missing, search])

  const validFiltered = filtered.filter((c) => c.valid)
  const invalidCount = missing.filter((c) => !c.valid).length

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedEmails.size === validFiltered.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(validFiltered.map((c) => c.email)))
    }
  }

  const handlePush = async () => {
    if (!campaignId) return
    setShowResult(false)
    const emails = selectedEmails.size > 0 ? Array.from(selectedEmails) : null
    await pushMutation.mutateAsync({ campaign_id: campaignId, lead_emails: emails })
    setSelectedEmails(new Set())
    setShowResult(true)
  }

  if (previewLoading || campaignsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  if (preview?.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
        <AlertTriangle size={14} />
        {preview.error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500">
            <FileSpreadsheet size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Excel Contacts</p>
            <p className="text-xl font-bold text-slate-800">{preview?.excel_total ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500">
            <Mail size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">In Instantly</p>
            <p className="text-xl font-bold text-slate-800">{preview?.instantly_total ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500">
            <ArrowRightLeft size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Missing</p>
            <p className="text-xl font-bold text-amber-600">{preview?.missing_count ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${invalidCount > 0 ? 'bg-red-500' : 'bg-slate-400'}`}>
            <XCircle size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Invalid Emails</p>
            <p className={`text-xl font-bold ${invalidCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {invalidCount}
            </p>
          </div>
        </div>
      </div>

      {/* Result banner */}
      {showResult && pushMutation.data && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            pushMutation.data.errors.length > 0
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {pushMutation.data.errors.length > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          <span>
            Pushed <strong>{pushMutation.data.pushed}</strong> leads.
            {pushMutation.data.skipped > 0 && ` Skipped ${pushMutation.data.skipped} (invalid email).`}
            {pushMutation.data.failed > 0 && ` Failed: ${pushMutation.data.failed}.`}
            {pushMutation.data.errors.map((e, i) => (
              <span key={i} className="block text-xs mt-1">{e}</span>
            ))}
          </span>
        </div>
      )}

      {pushMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={14} />
          {pushMutation.error?.message || 'Push failed'}
        </div>
      )}

      {/* Action bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap items-center gap-3">
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[200px]"
        >
          <option value="">Select campaign...</option>
          {(campaigns || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.status_label})
            </option>
          ))}
        </select>

        <button
          onClick={handlePush}
          disabled={!campaignId || pushMutation.isPending || missing.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={14} className={pushMutation.isPending ? 'animate-bounce' : ''} />
          {pushMutation.isPending
            ? 'Pushing...'
            : selectedEmails.size > 0
              ? `Push ${selectedEmails.size} Selected`
              : `Push All ${missing.filter((c) => c.valid).length} Valid`}
        </button>

        <button
          onClick={() => refetchPreview()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh Preview
        </button>

        {selectedEmails.size > 0 && (
          <span className="text-xs text-slate-500 ml-auto">
            {selectedEmails.size} of {validFiltered.length} selected
          </span>
        )}
      </div>

      {/* Missing contacts table */}
      {missing.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-slate-400" />
            <h3 className="text-sm font-medium text-slate-700">
              Missing Contacts ({missing.length})
            </h3>
            <div className="ml-auto relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={selectedEmails.size === validFiltered.length && validFiltered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-3 py-3 font-medium">Name</th>
                  <th className="text-left px-3 py-3 font-medium">Email</th>
                  <th className="text-left px-3 py-3 font-medium">Company</th>
                  <th className="text-left px-3 py-3 font-medium">Title</th>
                  <th className="text-left px-3 py-3 font-medium">Phone</th>
                  <th className="text-left px-3 py-3 font-medium">LinkedIn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr
                    key={c.email}
                    className={`hover:bg-slate-50 transition-colors ${!c.valid ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      {c.valid ? (
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(c.email)}
                          onChange={() => toggleEmail(c.email)}
                          className="rounded border-slate-300"
                        />
                      ) : (
                        <AlertTriangle size={14} className="text-red-400" title="Invalid email" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 font-medium whitespace-nowrap">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{c.email}</td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[140px] truncate">
                      {c.company || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[120px] truncate">
                      {c.title || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{c.phone || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[120px] truncate">
                      {c.linkedin || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">All Synced</p>
          <p className="text-sm text-slate-400 mt-1">
            All Excel contacts are already in Instantly.
          </p>
        </div>
      )}
    </div>
  )
}
