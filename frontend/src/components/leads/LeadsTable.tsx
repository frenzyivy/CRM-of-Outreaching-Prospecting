import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X, MapPin, GitBranch, Inbox, ShieldCheck } from 'lucide-react'
import { usePeopleView } from '../../hooks/useLeads'
import Badge from '../common/Badge'
import LeadScoreBadge from '../common/LeadScoreBadge'
import type { Lead } from '../../types'

interface Props {
  onSelect: (lead: Lead, filteredLeads?: Lead[]) => void
  onSelectCompany?: (companyName: string) => void
  initialSearch?: string
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500]

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

const PLATFORM_COLORS: Record<string, string> = {
  instantly: 'bg-blue-100 text-blue-700',
  convertkit: 'bg-orange-100 text-orange-700',
  lemlist: 'bg-purple-100 text-purple-700',
  smartlead: 'bg-emerald-100 text-emerald-700',
}

const PLATFORM_LABELS: Record<string, string> = {
  instantly: 'Instantly',
  convertkit: 'ConvertKit',
  lemlist: 'Lemlist',
  smartlead: 'Smartlead',
}

function EmailPlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_COLORS[platform] || 'bg-slate-100 text-slate-600'
  const label = PLATFORM_LABELS[platform] || platform
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}


export default function LeadsTable({ onSelect, onSelectCompany, initialSearch = '' }: Props) {
  const { data: leads, isLoading } = usePeopleView()
  const [search, setSearch] = useState(initialSearch)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Derive unique filter options from data
  const sources = useMemo(() =>
    Array.from(new Set((leads || []).map((l) => l.source).filter(Boolean))).sort(),
    [leads]
  )
  const countries = useMemo(() =>
    Array.from(new Set((leads || []).map((l) => l.country).filter(Boolean))).sort(),
    [leads]
  )
  const stages = useMemo(() => {
    const stageMap = new Map<string, string>()
    ;(leads || []).forEach((l) => {
      if (l.stage) stageMap.set(l.stage, l.stage_label || l.stage)
    })
    return Array.from(stageMap.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [leads])

  const matchesSearchFn = (l: Lead, q: string) =>
    !q ||
    l.full_name?.toLowerCase().includes(q) ||
    l.email?.toLowerCase().includes(q) ||
    l.company_name?.toLowerCase().includes(q) ||
    l.title?.toLowerCase().includes(q) ||
    l.country?.toLowerCase().includes(q) ||
    l.city?.toLowerCase().includes(q) ||
    l.specialty?.toLowerCase().includes(q)

  const filtered = useMemo(() => (leads || []).filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = matchesSearchFn(l, q)
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    const matchStatus = statusFilter === 'all' || (l.email_status || '').toLowerCase() === statusFilter
    const matchCountry = countryFilter === 'all' || l.country === countryFilter
    const matchStage = stageFilter === 'all' || l.stage === stageFilter
    return matchSearch && matchSource && matchStatus && matchCountry && matchStage
  }), [leads, search, sourceFilter, statusFilter, countryFilter, stageFilter])

  // Per-filter individual counts (search-aware: each filter counted independently against search-filtered base)
  const filterCounts = useMemo(() => {
    const all = leads || []
    const q = search.toLowerCase()
    const searchFiltered = !q ? all : all.filter(l => matchesSearchFn(l, q))
    return {
      search: q ? searchFiltered.length : 0,
      country: countryFilter !== 'all'
        ? searchFiltered.filter(l => l.country === countryFilter).length
        : 0,
      stage: stageFilter !== 'all'
        ? searchFiltered.filter(l => l.stage === stageFilter).length
        : 0,
      source: sourceFilter !== 'all'
        ? searchFiltered.filter(l => l.source === sourceFilter).length
        : 0,
      status: statusFilter !== 'all'
        ? searchFiltered.filter(l => (l.email_status || '').toLowerCase() === statusFilter).length
        : 0,
    }
  }, [leads, search, countryFilter, stageFilter, sourceFilter, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedLeads = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Reset page when filters change
  const resetPage = () => setPage(1)

  const activeFilterCount = [sourceFilter, statusFilter, countryFilter, stageFilter].filter(f => f !== 'all').length
  const hasAnyFilter = activeFilterCount > 0 || search.trim().length > 0
  const totalActiveFilters = activeFilterCount + (search.trim() ? 1 : 0)

  const clearAllFilters = () => {
    setSourceFilter('all')
    setStatusFilter('all')
    setCountryFilter('all')
    setStageFilter('all')
    setSearch('')
    setPage(1)
  }

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96" />
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads by name, email, company, title, or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
          <Filter size={13} />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">{activeFilterCount}</span>
          )}
        </div>

        <select
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); resetPage() }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white text-slate-600"
        >
          <option value="all">All locations</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); resetPage() }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white text-slate-600"
        >
          <option value="all">All stages</option>
          {stages.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); resetPage() }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white text-slate-600"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage() }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white text-slate-600"
        >
          <option value="all">All statuses</option>
          <option value="valid">Valid</option>
          <option value="risky">Risky</option>
          <option value="invalid">Invalid</option>
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={12} />
            Clear all
          </button>
        )}
      </div>

      {/* Active filter count chips */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
          {countryFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs">
              <MapPin size={11} className="text-blue-500" />
              <span className="text-slate-600">{countryFilter}</span>
              <span className="font-semibold text-blue-700">{filterCounts.country}</span>
              <button onClick={() => { setCountryFilter('all'); resetPage() }} className="ml-0.5 text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            </span>
          )}
          {stageFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs">
              <GitBranch size={11} className="text-purple-500" />
              <span className="text-slate-600">{stages.find(([v]) => v === stageFilter)?.[1] || stageFilter}</span>
              <span className="font-semibold text-purple-700">{filterCounts.stage}</span>
              <button onClick={() => { setStageFilter('all'); resetPage() }} className="ml-0.5 text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            </span>
          )}
          {sourceFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-xs">
              <Inbox size={11} className="text-amber-500" />
              <span className="text-slate-600">{sourceFilter}</span>
              <span className="font-semibold text-amber-700">{filterCounts.source}</span>
              <button onClick={() => { setSourceFilter('all'); resetPage() }} className="ml-0.5 text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-xs">
              <ShieldCheck size={11} className="text-green-500" />
              <span className="text-slate-600 capitalize">{statusFilter}</span>
              <span className="font-semibold text-green-700">{filterCounts.status}</span>
              <button onClick={() => { setStatusFilter('all'); resetPage() }} className="ml-0.5 text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            </span>
          )}

          {activeFilterCount > 1 && (
            <>
              <span className="text-slate-300 mx-1">|</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
                <span className="text-slate-500">Combined result</span>
                <span className="font-bold text-slate-800">{filtered.length}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Filter count summary bar */}
      {hasAnyFilter && (
        <div className="px-4 py-2 border-b border-slate-100 bg-blue-50/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-500 font-medium">Matching:</span>

          {search.trim() && (
            <span className="text-slate-600">
              Search &ldquo;{search.trim().length > 20 ? search.trim().slice(0, 20) + '…' : search.trim()}&rdquo;:
              <span className="font-semibold text-slate-800 ml-1">{filterCounts.search}</span>
            </span>
          )}

          {countryFilter !== 'all' && (
            <span className="text-slate-600">
              {countryFilter}: <span className="font-semibold text-blue-700 ml-1">{filterCounts.country}</span>
            </span>
          )}

          {stageFilter !== 'all' && (
            <span className="text-slate-600">
              {stages.find(([v]) => v === stageFilter)?.[1] || stageFilter}: <span className="font-semibold text-purple-700 ml-1">{filterCounts.stage}</span>
            </span>
          )}

          {sourceFilter !== 'all' && (
            <span className="text-slate-600">
              {sourceFilter}: <span className="font-semibold text-amber-700 ml-1">{filterCounts.source}</span>
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="text-slate-600 capitalize">
              {statusFilter}: <span className="font-semibold text-green-700 ml-1">{filterCounts.status}</span>
            </span>
          )}

          {totalActiveFilters > 1 && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700 font-semibold">
                Combined: {filtered.length} leads
              </span>
            </>
          )}

          {totalActiveFilters === 1 && (
            <span className="text-slate-500 ml-auto">
              {filtered.length} of {leads?.length || 0} leads
            </span>
          )}
        </div>
      )}

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
              <th className="px-4 py-3 font-medium text-slate-600">Specialty</th>
              <th className="px-4 py-3 font-medium text-slate-600">Source</th>
              <th className="px-4 py-3 font-medium text-slate-600">Score</th>
              <th className="px-4 py-3 font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 font-medium text-slate-600">Email Tool</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLeads.map((lead) => (
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
                <td className="px-4 py-3 text-slate-600 max-w-32 truncate">{lead.title || '—'}</td>
                <td className="px-4 py-3 max-w-36">
                  {(lead.company_name) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onSelectCompany) onSelectCompany(lead.company_name as string)
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate max-w-full text-left"
                    >
                      {lead.company_name}
                    </button>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-44 truncate">{lead.email || '—'}</td>
                <td className="px-4 py-3">
                  <EmailStatusBadge status={lead.email_status || ''} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {[lead.city, lead.country].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs max-w-32 truncate">{lead.specialty || '—'}</td>
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
                <td className="px-4 py-3">
                  {lead.email_platform ? (
                    <EmailPlatformBadge platform={lead.email_platform as string} />
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination controls */}
      <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Left: count info */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Showing <span className="font-medium text-slate-700">{filtered.length > 0 ? (safePage - 1) * pageSize + 1 : 0}</span>
            {' '}-{' '}
            <span className="font-medium text-slate-700">{Math.min(safePage * pageSize, filtered.length)}</span>
            {' '}of{' '}
            <span className="font-medium text-slate-700">{filtered.length}</span> leads
          </span>
          {filtered.length !== (leads?.length || 0) && (
            <span className="text-slate-400">({leads?.length || 0} total)</span>
          )}
        </div>

        {/* Center: page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft size={14} className="text-slate-600" />
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={14} className="text-slate-600" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5 mx-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-1 text-xs text-slate-300">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                      safePage === p
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight size={14} className="text-slate-600" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight size={14} className="text-slate-600" />
          </button>
        </div>

        {/* Right: page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-600"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
