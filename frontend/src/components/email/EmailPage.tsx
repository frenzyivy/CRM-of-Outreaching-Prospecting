import { useState } from 'react'
import { LayoutDashboard, Zap, Mail, Target, Activity } from 'lucide-react'
import Header from '../layout/Header'
import OverviewTab from './OverviewTab'
import InstantlyTab from './InstantlyTab'
import PlatformTab from './PlatformTab'
import type { EmailPlatform } from '@/types'
import { PLATFORM_TOKENS } from '@/utils/emailConstants'

type TabId = 'overview' | 'instantly' | 'convertkit' | 'lemlist' | 'smartlead'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',     icon: LayoutDashboard },
  { id: 'instantly',  label: 'Instantly.ai', icon: Zap             },
  { id: 'convertkit', label: 'ConvertKit',   icon: Mail            },
  { id: 'lemlist',    label: 'Lemlist',      icon: Target          },
  { id: 'smartlead',  label: 'Smartlead',    icon: Activity        },
]

// Platforms powered by the new PlatformTab (all except 'instantly' which has its own legacy tab)
const PLATFORM_TAB_IDS = new Set<TabId>(['convertkit', 'lemlist', 'smartlead'])

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const getTabColor = (id: TabId): string => {
    if (id === 'overview' || id === 'instantly') return '#3b82f6'
    return PLATFORM_TOKENS[id as EmailPlatform].color
  }

  return (
    <div>
      <Header title="Email" subtitle="Multi-channel email analytics & inbox management" />

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 mb-6 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const color = getTabColor(id)
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${!isActive ? 'text-slate-400 dark:text-gray-400' : ''}`}
              style={{
                borderBottomColor: isActive ? color : 'transparent',
                color: isActive ? color : undefined,
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'instantly' && <InstantlyTab />}
      {PLATFORM_TAB_IDS.has(activeTab) && (
        <PlatformTab platform={activeTab as EmailPlatform} />
      )}
    </div>
  )
}
