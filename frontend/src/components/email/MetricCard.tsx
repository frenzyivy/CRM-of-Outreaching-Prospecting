import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string | number
  sub?: string
  className?: string
}

export default function MetricCard({ label, value, sub, className }: Props) {
  return (
    <div className={cn('bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-4', className)}>
      <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
