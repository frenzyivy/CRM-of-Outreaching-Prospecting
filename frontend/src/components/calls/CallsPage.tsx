import { Phone } from 'lucide-react'
import Header from '../layout/Header'

export default function CallsPage() {
  return (
    <div>
      <Header title="Calls" subtitle="AI caller performance & analytics" />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-4">
          <Phone size={28} className="text-orange-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Coming Soon — Retell AI
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Connect your Retell AI account to see call analytics, AI caller performance,
          and conversation insights here.
        </p>
      </div>
    </div>
  )
}
