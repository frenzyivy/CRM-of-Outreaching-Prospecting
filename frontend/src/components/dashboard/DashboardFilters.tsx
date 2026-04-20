import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { DashboardFilters } from '../../hooks/useDashboardStats'

const dateRanges = ['Today', 'Last 2 Days', 'This Week', 'This Month'] as const
export type DateRange = (typeof dateRanges)[number]

const PIPELINE_STAGES = [
  { value: '', label: 'All Stages' },
  { value: 'new', label: 'New' },
  { value: 'researched', label: 'Researched' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'follow_up_1', label: 'Follow Up 1' },
  { value: 'follow_up_2', label: 'Follow Up 2' },
  { value: 'responded', label: 'Responded' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'free_trial', label: 'Free Trial' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

interface DashboardFiltersProps {
  onFilterChange?: (filters: DashboardFilters) => void
}

export default function DashboardFilters({ onFilterChange }: DashboardFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange>('This Month')
  const [country, setCountry] = useState('')
  const [pipelineStage, setPipelineStage] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const activeFilterCount = [country, pipelineStage].filter(Boolean).length

  const emit = (updates: Partial<DashboardFilters>) => {
    onFilterChange?.({
      dateRange,
      country: country || undefined,
      pipelineStage: pipelineStage || undefined,
      ...updates,
    })
  }

  const handleDateRange = (dr: DateRange) => {
    setDateRange(dr)
    emit({ dateRange: dr })
  }

  const handleCountry = (v: string) => {
    setCountry(v)
    emit({ country: v || undefined })
  }

  const handleStage = (v: string) => {
    setPipelineStage(v)
    emit({ pipelineStage: v || undefined })
  }

  const clearAll = () => {
    setCountry('')
    setPipelineStage('')
    onFilterChange?.({ dateRange })
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {/* Filters button */}
      <button
        onClick={() => setPanelOpen((p) => !p)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
          panelOpen || activeFilterCount > 0
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700'
            : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <SlidersHorizontal size={13} />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-0.5 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Date range pill group */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0">
        {dateRanges.map((dr) => (
          <button
            key={dr}
            onClick={() => handleDateRange(dr)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              dateRange === dr
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {dr}
          </button>
        ))}
      </div>

      {/* Expandable filter panel */}
      {panelOpen && (
        <div className="w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
          {/* Country */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => handleCountry(e.target.value)}
              placeholder="e.g. India, USA"
              className="w-40 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Pipeline Stage */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Pipeline Stage</label>
            <select
              value={pipelineStage}
              onChange={(e) => handleStage(e.target.value)}
              className="w-44 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
