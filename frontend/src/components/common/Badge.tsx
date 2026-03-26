import { cn } from '../../lib/utils'

const stageColors: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700',
  researched: 'bg-blue-50 text-blue-700',
  email_sent: 'bg-indigo-50 text-indigo-700',
  follow_up_1: 'bg-violet-50 text-violet-700',
  follow_up_2: 'bg-purple-50 text-purple-700',
  responded: 'bg-emerald-50 text-emerald-700',
  meeting: 'bg-amber-50 text-amber-700',
  proposal: 'bg-orange-50 text-orange-700',
  free_trial: 'bg-cyan-50 text-cyan-700',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-50 text-red-700',
}

export default function Badge({ stage, label }: { stage: string; label: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', stageColors[stage] || 'bg-slate-100 text-slate-600')}>
      {label}
    </span>
  )
}
