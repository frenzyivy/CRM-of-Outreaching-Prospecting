import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Mail, Clock, XCircle, ArrowRight } from 'lucide-react'
import api from '../../api/client'

interface AttentionItem {
  id: string
  type: 'unreplied' | 'stale' | 'bounced'
  lead_name: string
  email: string
  detail: string
  days_ago: number
}

interface NeedsAttentionData {
  items: AttentionItem[]
  total: number
}

const typeConfig = {
  unreplied: { icon: Mail, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30', label: 'No reply' },
  stale: { icon: Clock, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30', label: 'Stale' },
  bounced: { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30', label: 'Bounced' },
}

export default function NeedsAttention() {
  const { data, isLoading } = useQuery<NeedsAttentionData>({
    queryKey: ['needs-attention'],
    queryFn: async () => (await api.get('/dashboard/needs-attention')).data,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Needs Attention</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Needs Attention</h3>
        </div>
        {items.length > 0 && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
            {data?.total ?? items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">All caught up — nothing needs attention right now.</p>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item) => {
            const config = typeConfig[item.type]
            const Icon = config.icon
            return (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
                <div className={`p-1.5 rounded-md shrink-0 ${config.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.lead_name || item.email}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.detail}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
