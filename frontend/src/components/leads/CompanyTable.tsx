import { useState } from 'react'
import { Search, MapPin, Users } from 'lucide-react'
import { useCompanies } from '../../hooks/useCompanies'
import type { NormalizedCompany } from '../../types'

const STAGE_LABELS: Record<string, string> = {
  new: 'New', researched: 'Researched', email_sent: 'Email Sent',
  follow_up_1: 'Follow-up 1', follow_up_2: 'Follow-up 2',
  responded: 'Responded', meeting: 'Meeting', proposal: 'Proposal',
  free_trial: 'Free Trial', closed_won: 'Closed (Won)', closed_lost: 'Closed (Lost)',
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-600',
  researched: 'bg-blue-50 text-blue-600',
  email_sent: 'bg-indigo-50 text-indigo-600',
  follow_up_1: 'bg-violet-50 text-violet-600',
  follow_up_2: 'bg-purple-50 text-purple-600',
  responded: 'bg-sky-50 text-sky-600',
  meeting: 'bg-yellow-50 text-yellow-700',
  proposal: 'bg-orange-50 text-orange-600',
  free_trial: 'bg-amber-50 text-amber-600',
  closed_won: 'bg-green-50 text-green-600',
  closed_lost: 'bg-red-50 text-red-600',
}

interface Props {
  onSelect: (company: NormalizedCompany, filteredCompanies?: NormalizedCompany[]) => void
}

export default function CompanyTable({ onSelect }: Props) {
  const { data: companies, isLoading } = useCompanies()
  const [search, setSearch] = useState('')

  const filtered = (companies || []).filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.domain?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96" />
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-left border-b border-slate-100">
              <th className="px-4 py-3 font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 font-medium text-slate-600">Industry</th>
              <th className="px-4 py-3 font-medium text-slate-600">Size</th>
              <th className="px-4 py-3 font-medium text-slate-600">Country</th>
              <th className="px-4 py-3 font-medium text-slate-600">Locations</th>
              <th className="px-4 py-3 font-medium text-slate-600">Leads</th>
              <th className="px-4 py-3 font-medium text-slate-600">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((company) => {
              const stage = company.pipeline_stage || 'new'
              return (
                <tr
                  key={company.id}
                  onClick={() => onSelect(company, filtered)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {/* Company name + domain */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{company.name}</div>
                    {company.domain && (
                      <div className="text-xs text-slate-400">{company.domain}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-600">{company.industry || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{company.size || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{company.country || '—'}</td>

                  {/* Locations badge */}
                  <td className="px-4 py-3">
                    {(company.location_count ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                        <MapPin size={10} />
                        {company.location_count} location{company.location_count !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Leads badge */}
                  <td className="px-4 py-3">
                    {(company.lead_count ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                        <Users size={10} />
                        {company.lead_count} lead{company.lead_count !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Stage badge */}
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage] || STAGE_COLORS.new}`}>
                      {STAGE_LABELS[stage] || stage}
                    </span>
                  </td>
                </tr>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-100 text-xs text-slate-400">
        {filtered.length} of {companies?.length || 0} companies
      </div>
    </div>
  )
}
