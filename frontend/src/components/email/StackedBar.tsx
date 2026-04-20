import { PLATFORM_TOKENS, PLATFORM_ORDER } from '@/utils/emailConstants'
import type { EmailPlatform } from '@/types'

interface Segment {
  platform: EmailPlatform
  sent: number
}

interface Props {
  segments: Segment[]
  total: number    // global_daily_limit for scaling the bar
  className?: string
}

export default function StackedBar({ segments, total, className }: Props) {
  if (total <= 0) return null

  // Only show platforms that have sent > 0
  const active = PLATFORM_ORDER
    .map(p => segments.find(s => s.platform === p))
    .filter((s): s is Segment => !!s && s.sent > 0)

  return (
    <div className={`h-2 w-full bg-white/10 rounded-full overflow-hidden flex ${className ?? ''}`}>
      {active.map(seg => {
        const pct = Math.min(100, (seg.sent / total) * 100)
        const token = PLATFORM_TOKENS[seg.platform]
        return (
          <div
            key={seg.platform}
            title={`${token.label}: ${seg.sent} sent`}
            style={{ width: `${pct}%`, backgroundColor: token.color }}
          />
        )
      })}
    </div>
  )
}
