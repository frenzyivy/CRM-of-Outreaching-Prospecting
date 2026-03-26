import { useState } from 'react'
import { BarChart3, Mail, Phone, MessageCircle } from 'lucide-react'
import Header from '../layout/Header'
import OverviewTab from './OverviewTab'
import EmailTab from './EmailTab'
import CallsTab from './CallsTab'
import WhatsAppTab from './WhatsAppTab'
import { cn } from '../../lib/utils'

const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'calls', label: 'Calls', icon: Phone },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  return (
    <div>
      <Header title="Performance" subtitle="Channel performance & campaign analytics" />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'email' && <EmailTab />}
      {activeTab === 'calls' && <CallsTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
    </div>
  )
}
