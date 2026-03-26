import { MessageCircle, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function WhatsAppTab() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={28} className="text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          WhatsApp Performance
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          Connect your Meta WhatsApp Business API to see messaging analytics — conversations initiated,
          delivery rates, response rates, and conversion metrics.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto mb-6">
          <PlaceholderStat label="Messages Sent" value="—" />
          <PlaceholderStat label="Delivered" value="—" />
          <PlaceholderStat label="Conversations" value="—" />
          <PlaceholderStat label="Conversions" value="—" />
        </div>

        <button
          onClick={() => navigate('/integrations')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <Settings size={14} />
          Connect WhatsApp Business
        </button>
      </div>
    </div>
  )
}

function PlaceholderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
      <p className="text-xl font-bold text-slate-300 dark:text-slate-600">{value}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{label}</p>
    </div>
  )
}
