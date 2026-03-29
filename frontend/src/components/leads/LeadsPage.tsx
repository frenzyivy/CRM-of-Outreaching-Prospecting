import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Database, BarChart3 } from 'lucide-react'
import Header from '../layout/Header'
import CompanyTable from './CompanyTable'
import LeadsTable from './LeadsTable'
import AnalyticsTab from './AnalyticsTab'
import LeadDetailDrawer from './LeadDetailDrawer'
import CompanyDetailDrawer from './CompanyDetailDrawer'
import { cn } from '../../lib/utils'
import api from '../../api/client'
import type { Lead } from '../../types'

const tabs = [
  { key: 'company-data', label: 'Company Data', icon: Building2 },
  { key: 'leads', label: 'Lead Data', icon: Database },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('company-data')

  // Company selection -> drawer with navigation
  const [selectedCompany, setSelectedCompany] = useState<Lead | null>(null)
  const [allCompanies, setAllCompanies] = useState<Lead[]>([])

  const handleSelectCompany = useCallback((company: Lead, filteredCompanies?: Lead[]) => {
    setSelectedCompany(company)
    if (filteredCompanies) setAllCompanies(filteredCompanies)
  }, [])

  const handleNavigateCompany = useCallback((direction: 'prev' | 'next') => {
    if (!selectedCompany || allCompanies.length === 0) return
    const idx = allCompanies.findIndex(c => c.id === selectedCompany.id)
    if (idx === -1) return
    const nextIdx = direction === 'next'
      ? (idx + 1) % allCompanies.length
      : (idx - 1 + allCompanies.length) % allCompanies.length
    setSelectedCompany(allCompanies[nextIdx])
  }, [selectedCompany, allCompanies])

  // Lead Data selection -> drawer with navigation
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [allLeads, setAllLeads] = useState<Lead[]>([])

  const handleSelectLead = useCallback((lead: Lead, filteredLeads?: Lead[]) => {
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

  // Cross-drawer navigation: lead drawer -> company drawer
  const handleOpenCompanyByName = useCallback((companyName: string) => {
    setSelectedLead(null)
    setActiveTab('company-data')

    const cached = queryClient.getQueryData<Lead[]>(['leads', 'company-view'])
    if (cached) {
      const match = cached.find(c => c.company_name?.toLowerCase() === companyName.toLowerCase())
      if (match) {
        setSelectedCompany(match)
        setAllCompanies(cached)
        return
      }
    }
    queryClient.fetchQuery<Lead[]>({
      queryKey: ['leads', 'company-view'],
      queryFn: async () => (await api.get('/leads/company-view')).data,
    }).then((companies) => {
      const match = companies.find(c => c.company_name?.toLowerCase() === companyName.toLowerCase())
      if (match) {
        setSelectedCompany(match)
        setAllCompanies(companies)
      }
    })
  }, [queryClient])

  // Cross-drawer navigation: company drawer -> lead drawer
  const handleOpenLeadById = useCallback((lead: Lead) => {
    setSelectedCompany(null)
    setActiveTab('leads')
    setSelectedLead(lead)
  }, [])

  return (
    <div>
      <Header title="Leads" subtitle="Manage companies and lead records" />

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
      {activeTab === 'company-data' && (
        <CompanyTable onSelect={handleSelectCompany} />
      )}
      {activeTab === 'leads' && (
        <LeadsTable onSelect={handleSelectLead} />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsTab />
      )}

      {/* Detail overlays */}
      {selectedCompany && (
        <CompanyDetailDrawer
          lead={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onNavigate={handleNavigateCompany}
          onOpenLead={handleOpenLeadById}
        />
      )}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onNavigate={handleNavigate}
          onOpenCompany={handleOpenCompanyByName}
        />
      )}
    </div>
  )
}
