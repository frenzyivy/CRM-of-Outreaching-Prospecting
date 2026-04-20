import { useState, useMemo } from 'react'
import { X, Users, CheckCircle } from 'lucide-react'
import { usePeopleView } from '../../hooks/useLeads'
import { useBulkAssignPlatform } from '../../hooks/useEmail'
import type { EmailPlatformId, Lead } from '../../types'

const PLATFORMS: { id: EmailPlatformId; name: string }[] = [
  { id: 'instantly', name: 'Instantly.ai' },
  { id: 'convertkit', name: 'ConvertKit' },
  { id: 'lemlist', name: 'Lemlist' },
  { id: 'smartlead', name: 'Smartlead' },
]

interface Props {
  onClose: () => void
}

export default function BulkAssignModal({ onClose }: Props) {
  const { data: leads } = usePeopleView()
  const { mutateAsync, isPending } = useBulkAssignPlatform()

  const [platform, setPlatform] = useState<EmailPlatformId>('instantly')
  const [stageFilter, setStageFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [success, setSuccess] = useState<number | null>(null)

  const stages = useMemo(() => {
    const map = new Map<string, string>()
    ;(leads || []).forEach((l) => { if (l.stage) map.set(l.stage, l.stage_label || l.stage) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [leads])

  const countries = useMemo(() =>
    Array.from(new Set((leads || []).map((l) => l.country).filter(Boolean))).sort(),
    [leads]
  )

  const filtered: Lead[] = useMemo(() => (leads || []).filter((l) => {
    const matchStage = stageFilter === 'all' || l.stage === stageFilter
    const matchCountry = countryFilter === 'all' || l.country === countryFilter
    return matchStage && matchCountry
  }), [leads, stageFilter, countryFilter])

  const handleAssign = async () => {
    const ids = filtered.map((l) => l.id)
    if (!ids.length) return
    const res = await mutateAsync({ leadIds: ids, platform })
    setSuccess((res.data as { updated?: number })?.updated ?? ids.length)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">Bulk Assign Email Platform</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {success !== null ? (
          <div className="p-8 text-center">
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-800 dark:text-white font-semibold text-lg">{success} leads updated</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              All matched leads have been assigned to{' '}
              <span className="font-medium">{PLATFORMS.find((p) => p.id === platform)?.name}</span>.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Platform selection */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                Assign to platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as EmailPlatformId)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white bg-white dark:bg-[#12172a] focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Filter: Stage */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                Filter by stage <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
              </label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white bg-white dark:bg-[#12172a] focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All stages</option>
                {stages.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            {/* Filter: Country */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                Filter by country <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
              </label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white bg-white dark:bg-[#12172a] focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Preview count */}
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Leads matching filters</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{filtered.length.toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={isPending || filtered.length === 0}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isPending
                  ? 'Assigning...'
                  : `Assign ${filtered.length.toLocaleString()} leads`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
