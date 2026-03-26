import { X, Sparkles, Zap, Shield, BarChart2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

const updates = [
  {
    version: 'v1.4.0',
    date: 'March 2026',
    icon: BarChart2,
    color: 'bg-blue-100 text-blue-600',
    title: 'Dashboard Analytics Revamp',
    items: [
      'New activity chart with monthly trend view',
      'Pipeline value breakdown by stage',
      'Lead source attribution tracking',
    ],
  },
  {
    version: 'v1.3.0',
    date: 'February 2026',
    icon: Zap,
    color: 'bg-amber-100 text-amber-600',
    title: 'Email Automation',
    items: [
      'Bulk email campaigns with personalization',
      'Open and click tracking per contact',
      'Auto follow-up scheduling',
    ],
  },
  {
    version: 'v1.2.0',
    date: 'January 2026',
    icon: Shield,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Security & Compliance',
    items: [
      'HIPAA-aligned data handling updates',
      'Role-based access controls',
      'Audit log for all lead edits',
    ],
  },
  {
    version: 'v1.1.0',
    date: 'December 2025',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-600',
    title: 'AI Lead Scoring',
    items: [
      'Automatic lead priority scoring',
      'Smart follow-up recommendations',
      'Engagement likelihood prediction',
    ],
  },
]

export default function WhatsNewModal({ onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">What's New</h2>
                <p className="text-xs text-slate-500">Latest updates & features</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {updates.map((update) => {
              const Icon = update.icon
              return (
                <div key={update.version}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${update.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{update.title}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                          {update.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{update.date}</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 pl-12">
                    {update.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
