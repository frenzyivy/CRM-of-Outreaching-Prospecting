import { cn } from '@/lib/utils'

interface Props {
  value: number        // 0–100
  color?: string       // Tailwind bg color class, default blue
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({ value, color = 'bg-blue-500', className, showLabel }: Props) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('w-full', className)}>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-0.5 text-right">{clamped}%</p>
      )}
    </div>
  )
}
