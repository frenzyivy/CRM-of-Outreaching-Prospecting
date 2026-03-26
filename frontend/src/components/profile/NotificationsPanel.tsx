import { X, Bell, CheckCheck, User, Mail, Phone } from 'lucide-react'

interface Props {
  onClose: () => void
}

const notifications = [
  {
    id: 1,
    icon: User,
    color: 'bg-blue-100 text-blue-600',
    title: 'New lead assigned',
    body: 'Dr. James Wilson has been assigned to your pipeline.',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 2,
    icon: Mail,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Email campaign sent',
    body: '142 emails delivered successfully to cardiology contacts.',
    time: '1 hour ago',
    unread: true,
  },
  {
    id: 3,
    icon: Phone,
    color: 'bg-purple-100 text-purple-600',
    title: 'Call reminder',
    body: 'Follow-up call scheduled with Metro Hospital at 3:00 PM.',
    time: '3 hours ago',
    unread: true,
  },
  {
    id: 4,
    icon: Bell,
    color: 'bg-amber-100 text-amber-600',
    title: 'Pipeline stage updated',
    body: 'Sunrise Clinic moved to "Proposal Sent" stage.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 5,
    icon: Mail,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Email opened',
    body: 'Dr. Priya Mehta opened your outreach email.',
    time: 'Yesterday',
    unread: false,
  },
]

export default function NotificationsPanel({ onClose }: Props) {
  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <CheckCheck size={14} />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {notifications.map((n) => {
            const Icon = n.icon
            return (
              <div
                key={n.id}
                className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                  n.unread ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{n.title}</p>
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-1">
            View all notifications
          </button>
        </div>
      </div>
    </>
  )
}
