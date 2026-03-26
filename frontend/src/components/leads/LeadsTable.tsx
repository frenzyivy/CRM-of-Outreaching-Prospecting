import { useState } from 'react'
import { Search } from 'lucide-react'
import { useLeadsData } from '../../hooks/useLeads'
import Badge from '../common/Badge'
import LeadScoreBadge from '../common/LeadScoreBadge'
import type { LeadRecord } from '../../types'

interface Props {
  onSelect: (lead: LeadRecord, filteredLeads?: LeadRecord[]) => void
}

function EmailStatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'valid') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">valid</span>
  }
  if (s === 'risky') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">risky</span>
  }
  if (s === 'invalid') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">invalid</span>
  }
  return <span className="text-xs text-slate-400">{status || '—'}</span>
}

function CompanyDataBadge({ value }: { value: string }) {
  const v = (value || '').toLowerCase()
  if (v === 'yes') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">No</span>
}

export default function LeadsTable({ onSelect }: Props) {
  const { data: leads, isLoading } = useLeadsData()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const sources = Array.from(new Set((leads || []).map((l) => l.source).filter(Boolean))).sort()

  const filtered = (leads || []).filter((l) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      l.full_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.job_title?.toLowerCase().includes(q) ||
      l.country?.toLowerCase().includes(q)
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    const matchStatus = statusFilter === 'all' || (l.email_status || '').toLowerCase() === statusFilter
    return matchSearch && matchSource && matchStatus
  })

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96" />
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm placeholder:text-slate-400"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm bg-white text-slate-600"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm bg-white text-slate-600"
        >
          <option value="all">All statuses</option>
          <option value="valid">Valid</option>
          <option value="risky">Risky</option>
          <option value="invalid">Invalid</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-left border-b border-slate-100">
              <th className="px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 font-medium text-slate-600">Title</th>
              <th className="px-4 py-3 font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Location</th>
              <th className="px-4 py-3 font-medium text-slate-600">Co. Data</th>
              <th className="px-4 py-3 font-medium text-slate-600">Source</th>
              <th className="px-4 py-3 font-medium text-slate-600">Score</th>
              <th className="px-4 py-3 font-medium text-slate-600">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead, filtered)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {lead.full_name || `${lead.first_name} ${lead.last_name}`.trim() || '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-32 truncate">{lead.job_title || '—'}</td>
                <td className="px-4 py-3 text-slate-600 max-w-36 truncate">{lead.company || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-44 truncate">{lead.email || '—'}</td>
                <td className="px-4 py-3">
                  <EmailStatusBadge status={lead.email_status} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {[lead.city, lead.country].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <CompanyDataBadge value={lead.company_data_available} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{lead.source || '—'}</td>
                <td className="px-4 py-3">
                  {lead.lead_tier ? (
                    <LeadScoreBadge score={lead.lead_score ?? 0} tier={lead.lead_tier} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge stage={lead.stage} label={lead.stage_label} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
        <span>{filtered.length} of {leads?.length || 0} leads</span>
        {leads && leads.length > 0 && (
          <span>
            {leads.filter((l) => (l.email_status || '').toLowerCase() === 'valid').length} valid ·{' '}
            {leads.filter((l) => (l.company_data_available || '').toLowerCase() === 'yes').length} with company data
          </span>
        )}
      </div>
    </div>
  )
}
