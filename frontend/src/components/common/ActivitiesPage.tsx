import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, StickyNote, ArrowRightLeft } from 'lucide-react'
import Header from '../layout/Header'
import api from '../../api/client'
import { formatDateTime } from '../../lib/utils'
import type { Activity } from '../../types'

const icons = {
  email: Mail,
  call: Phone,
  note: StickyNote,
  stage_change: ArrowRightLeft,
}

const colors = {
  email: 'bg-blue-50 text-blue-600',
  call: 'bg-green-50 text-green-600',
  note: 'bg-amber-50 text-amber-600',
  stage_change: 'bg-purple-50 text-purple-600',
}

export default function ActivitiesPage() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ['all-activities'],
    queryFn: async () => (await api.get('/activities?limit=100')).data,
  })

  return (
    <div>
      <Header title="Activities" subtitle="All email, call, and stage activity logs" />
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 h-16 animate-pulse" />
          ))}
        </div>
      ) : activities && activities.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
          {activities.map((activity) => {
            const Icon = icons[activity.activity_type as keyof typeof icons] || StickyNote
            const color = colors[activity.activity_type as keyof typeof colors] || 'bg-slate-50 text-slate-600'
            return (
              <div key={activity.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{activity.description || 'No description'}</p>
                  <p className="text-xs text-slate-400">
                    {activity.activity_type} &middot; {activity.lead_type}:{activity.lead_key}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDateTime(activity.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          No activities logged yet. Open a lead and log emails, calls, or notes.
        </div>
      )}
    </div>
  )
}
