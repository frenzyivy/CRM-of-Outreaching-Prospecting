import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

const dateRanges = ['Today', 'Last 2 Days', 'This Week', 'This Month'] as const
export type DateRange = (typeof dateRanges)[number]

interface DashboardFiltersProps {
  onFilterChange?: (filters: { dateRange: DateRange }) => void
}

export default function DashboardFilters({ onFilterChange }: DashboardFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange>('This Month')

  const handleDateRange = (dr: DateRange) => {
    setDateRange(dr)
    onFilterChange?.({ dateRange: dr })
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mr-0.5">
        <SlidersHorizontal size={13} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filters</span>
      </div>

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
    </div>
  )
}
