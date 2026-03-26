import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface EnhancedStatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
  subtitle?: string
  change?: number // percentage change vs last week
  drilldownText?: string
}

// Map bg color → { light bg, text color } for icon container
const iconColorMap: Record<string, { bg: string; text: string }> = {
  'bg-blue-500':    { bg: 'bg-blue-50',    text: 'text-blue-500' },
  'bg-violet-500':  { bg: 'bg-violet-50',  text: 'text-violet-500' },
  'bg-emerald-500': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'bg-orange-500':  { bg: 'bg-orange-50',  text: 'text-orange-500' },
  'bg-indigo-500':  { bg: 'bg-indigo-50',  text: 'text-indigo-500' },
  'bg-cyan-500':    { bg: 'bg-cyan-50',    text: 'text-cyan-600' },
  'bg-teal-600':    { bg: 'bg-teal-50',    text: 'text-teal-600' },
  'bg-rose-500':    { bg: 'bg-rose-50',    text: 'text-rose-500' },
  'bg-purple-500':  { bg: 'bg-purple-50',  text: 'text-purple-500' },
}
const fallbackIcon = { bg: 'bg-slate-100', text: 'text-slate-500' }

export default function EnhancedStatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  change,
  drilldownText,
}: EnhancedStatCardProps) {
  const [showDrilldown, setShowDrilldown] = useState(false)

  const isPositive = change !== undefined && change >= 0
  const iconStyle = iconColorMap[color] ?? fallbackIcon
  const displayValue =
    typeof value === 'number' && value >= 10000
      ? value >= 1000000
        ? `$${(value / 1000000).toFixed(1)}M`
        : value.toLocaleString()
      : value

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all"
      onClick={() => setShowDrilldown(!showDrilldown)}
    >
      {/* Top row: icon + change badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-xl', iconStyle.bg, 'dark:bg-opacity-20')}>
          <Icon size={18} className={iconStyle.text} />
        </div>
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold',
              isPositive
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
            )}
          >
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{displayValue}</p>

      {/* Title + subtitle */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}

      {/* Drilldown */}
      {showDrilldown && drilldownText && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          {drilldownText}
        </div>
      )}
    </div>
  )
}
