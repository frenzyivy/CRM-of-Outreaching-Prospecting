import { useState } from 'react'
import { Mail, Phone, PhoneOff, Calendar, ArrowRight, MessageSquare, Reply } from 'lucide-react'
import type { ActivityFeedItem, ActivityAction } from '../../data/mockDashboardData'
import { activityFeed } from '../../data/mockDashboardData'

const actionConfig: Record<ActivityAction, { icon: typeof Mail; label: string; colorClass: string }> = {
  email_sent: { icon: Mail, label: 'Email Sent', colorClass: 'text-blue-400 bg-blue-400/10' },
  email_replied: { icon: Reply, label: 'Reply Received', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  call_made: { icon: Phone, label: 'Call Made', colorClass: 'text-slate-400 bg-slate-400/10' },
  call_answered: { icon: Phone, label: 'Call Connected', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  call_missed: { icon: PhoneOff, label: 'No Answer', colorClass: 'text-slate-500 bg-slate-500/10' },
  meeting_booked: { icon: Calendar, label: 'Meeting Booked', colorClass: 'text-emerald-400 bg-emerald-400/10' },
  follow_up: { icon: MessageSquare, label: 'Follow-up', colorClass: 'text-amber-400 bg-amber-400/10' },
  stage_change: { icon: ArrowRight, label: 'Stage Change', colorClass: 'text-purple-400 bg-purple-400/10' },
}

type FilterType = 'all' | 'email' | 'call' | 'meeting'

export default function ActivityFeed() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [timeRange, setTimeRange] = useState<'today' | 'week'>('today')

  const filtered = activityFeed.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'email') return item.category === 'email'
    if (filter === 'call') return item.category === 'call'
    if (filter === 'meeting') return item.category === 'meeting'
    return true
  })

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'email', label: 'Emails' },
    { key: 'call', label: 'Calls' },
    { key: 'meeting', label: 'Meetings' },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">AI Agent Activity</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['today', 'week'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  timeRange === t ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t === 'today' ? 'Today' : 'This Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        {filtered.map((item) => {
          const config = actionConfig[item.action]
          const ActionIcon = config.icon
          return (
            <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${config.colorClass}`}>
                <ActionIcon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.contactName}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400 truncate">{item.company}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{item.result}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 mt-0.5">{formatTime(item.timestamp)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
