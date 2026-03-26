import { Flame, Thermometer, Snowflake } from 'lucide-react'
import { cn } from '../../lib/utils'

const tierConfig = {
  hot: {
    icon: Flame,
    color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    label: 'Hot',
  },
  warm: {
    icon: Thermometer,
    color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    label: 'Warm',
  },
  cold: {
    icon: Snowflake,
    color: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
    label: 'Cold',
  },
}

interface Props {
  score: number
  tier: 'hot' | 'warm' | 'cold'
  showScore?: boolean
}

export default function LeadScoreBadge({ score, tier, showScore = false }: Props) {
  const config = tierConfig[tier] ?? tierConfig.cold
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      <Icon size={11} />
      {config.label}
      {showScore && <span className="opacity-70">({score})</span>}
    </span>
  )
}
