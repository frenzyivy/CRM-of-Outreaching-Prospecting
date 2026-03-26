import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, Calendar, ArrowRight, XCircle, Check } from 'lucide-react'
import api from '../../api/client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  lead_id: string | null
  read: boolean
  created_at: string
}

const typeConfig: Record<string, { icon: typeof Mail; color: string }> = {
  email_reply: { icon: Mail, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  meeting_booked: { icon: Calendar, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
  stage_change: { icon: ArrowRight, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  bounce: { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications?limit=20')).data,
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/read`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors shadow-sm"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">No notifications yet</p>
            ) : (
              notifications.map((n) => {
                const config = typeConfig[n.type] ?? { icon: Bell, color: 'text-slate-500 bg-slate-50 dark:bg-slate-700' }
                const Icon = config.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors ${
                      n.read ? 'opacity-60' : 'bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${config.color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                      {n.message && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{n.message}</p>}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
