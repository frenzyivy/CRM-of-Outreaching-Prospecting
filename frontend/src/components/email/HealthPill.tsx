import { cn } from '@/lib/utils'
import { HEALTH_COLORS, HEALTH_LABELS } from '@/utils/emailConstants'
import type { HealthStatus } from '@/types'

interface Props {
  status: HealthStatus
  className?: string
}

export default function HealthPill({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        HEALTH_COLORS[status] ?? 'bg-gray-500/20 text-gray-400',
        className,
      )}
    >
      {HEALTH_LABELS[status] ?? status}
    </span>
  )
}
