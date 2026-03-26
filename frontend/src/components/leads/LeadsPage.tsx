import { useState, useCallback } from 'react'
import { Building2, Users, Database } from 'lucide-react'
import Header from '../layout/Header'
import CompanyTable from './CompanyTable'
import ContactTable from './ContactTable'
import LeadsTable from './LeadsTable'
import LeadDetailModal from './LeadDetailModal'
import LeadDetailDrawer from './LeadDetailDrawer'
import { cn } from '../../lib/utils'
import type { Company, Contact, LeadRecord } from '../../types'

const tabs = [
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'leads', label: 'Lead Data', icon: Database },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('companies')

  // Company / Contact selection -> modal
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Lead Data selection -> drawer with navigation
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)
  const [allLeads, setAllLeads] = useState<LeadRecord[]>([])

  const handleSelectLead = useCallback((lead: LeadRecord, filteredLeads?: LeadRecord[]) => {
    setSelectedLead(lead)
    if (filteredLeads) setAllLeads(filteredLeads)
  }, [])

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedLead || allLeads.length === 0) return
    const idx = allLeads.findIndex(l => l.id === selectedLead.id)
    if (idx === -1) return
    const nextIdx = direction === 'next'
      ? (idx + 1) % allLeads.length
      : (idx - 1 + allLeads.length) % allLeads.length
    setSelectedLead(allLeads[nextIdx])
  }, [selectedLead, allLeads])

  return (
    <div>
      <Header title="Leads" subtitle="Manage companies, contacts, and lead records" />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
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
      {activeTab === 'companies' && (
        <CompanyTable onSelect={setSelectedCompany} />
      )}
      {activeTab === 'contacts' && (
        <ContactTable onSelect={setSelectedContact} />
      )}
      {activeTab === 'leads' && (
        <LeadsTable onSelect={handleSelectLead} />
      )}

      {/* Detail overlays */}
      {selectedCompany && (
        <LeadDetailModal lead={selectedCompany} onClose={() => setSelectedCompany(null)} />
      )}
      {selectedContact && (
        <LeadDetailModal lead={selectedContact} onClose={() => setSelectedContact(null)} />
      )}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  )
}
