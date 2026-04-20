import { cn } from '@/lib/utils'
import { getRating, RATING_COLORS, type BenchmarkRating } from '@/utils/emailConstants'

interface Props {
  metricKey: string
  label: string
  rate: number
  count?: number
  className?: string
}

export default function RateCard({ metricKey, label, rate, count, className }: Props) {
  const rating: BenchmarkRating = getRating(metricKey, rate)
  const colorClass = RATING_COLORS[rating]

  return (
    <div className={cn('bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-4', className)}>
      <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', colorClass)}>{rate.toFixed(1)}%</p>
      {count !== undefined && (
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{count.toLocaleString()} total</p>
      )}
      <p className="text-xs mt-1 capitalize" style={{ color: rating === 'good' ? '#34d399' : rating === 'avg' ? '#facc15' : '#f87171' }}>
        {rating === 'good' ? 'Good' : rating === 'avg' ? 'Average' : 'Poor'}
      </p>
    </div>
  )
}
