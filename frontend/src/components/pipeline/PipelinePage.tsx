import { useState, useMemo, useRef } from 'react'
import { Search, SlidersHorizontal, Building2, Users } from 'lucide-react'
import Header from '../layout/Header'
import PipelineColumn from './PipelineColumn'
import LeadDetailModal from '../leads/LeadDetailModal'
import FieldsToggle from './FieldsToggle'
import { usePipeline, useUpdateStage } from '../../hooks/usePipeline'
import type { Lead } from '../../types'
import type { CompanyField, LeadField } from './fieldConfig'
import {
  loadCompanyFields, loadLeadFields,
  saveCompanyFields, saveLeadFields,
} from './fieldConfig'

type Tab = 'company' | 'contact'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'company', label: 'Companies', icon: <Building2 size={14} /> },
  { id: 'contact', label: 'Leads',     icon: <Users size={14} /> },
]

// ── Board ────────────────────────────────────────────────────────────────────

function PipelineBoard({
  leadType,
  search,
  onLeadClick,
  visibleCompanyFields,
  visibleLeadFields,
}: {
  leadType: Tab
  search: string
  onLeadClick: (lead: Lead) => void
  visibleCompanyFields: Set<CompanyField>
  visibleLeadFields: Set<LeadField>
}) {
  const { data: pipeline, isLoading } = usePipeline(leadType)
  const { mutate: updateStage } = useUpdateStage()
  const draggingLead = useRef<Lead | null>(null)

  const filteredStages = useMemo(() => {
    if (!pipeline || !search.trim()) return pipeline?.stages ?? {}
    const q = search.toLowerCase()
    const result: Record<string, Lead[]> = {}
    for (const stage of pipeline.stage_order) {
      result[stage] = (pipeline.stages[stage] ?? []).filter((lead) => {
        const raw = lead as unknown as Record<string, unknown>
        const name = lead.lead_type === 'company'
          ? (raw.company_name as string) ?? ''
          : (raw.full_name as string) || [raw.first_name, raw.last_name].filter(Boolean).join(' ') || ''
        const subtitle = (raw.company_name as string) || (raw.company as string) || (raw.industry as string) || ''
        return name.toLowerCase().includes(q) || subtitle.toLowerCase().includes(q)
      })
    }
    return result
  }, [pipeline, search])

  if (isLoading || !pipeline) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-shrink-0 w-[260px] h-60 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6">
      {pipeline.stage_order.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          label={pipeline.stage_labels[stage]}
          leads={filteredStages[stage] ?? []}
          onLeadClick={onLeadClick}
          onDragStart={(lead) => { draggingLead.current = lead }}
          onDrop={(targetStage) => {
            const lead = draggingLead.current
            if (!lead || lead.stage === targetStage) return
            updateStage({ leadType: lead.lead_type, leadId: lead.id, stage: targetStage })
            draggingLead.current = null
          }}
          visibleCompanyFields={visibleCompanyFields}
          visibleLeadFields={visibleLeadFields}
        />
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [search, setSearch] = useState('')

  // Field visibility — loaded from localStorage, persisted on change
  const [visibleCompanyFields, setVisibleCompanyFields] = useState<Set<CompanyField>>(loadCompanyFields)
  const [visibleLeadFields, setVisibleLeadFields] = useState<Set<LeadField>>(loadLeadFields)

  function handleCompanyFieldsChange(next: Set<CompanyField>) {
    setVisibleCompanyFields(next)
    saveCompanyFields(next)
  }

  function handleLeadFieldsChange(next: Set<LeadField>) {
    setVisibleLeadFields(next)
    saveLeadFields(next)
  }

  return (
    <div>
      <Header title="Pipeline" subtitle="Track leads across all stages" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch('') }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'company' ? 'companies' : 'contacts'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm placeholder:text-slate-400"
          />
        </div>

        <button className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <SlidersHorizontal size={14} />
          Filter
        </button>

        {/* Properties toggle — adapts to active tab */}
        {activeTab === 'company' ? (
          <FieldsToggle
            mode="company"
            visible={visibleCompanyFields}
            onChange={handleCompanyFieldsChange}
          />
        ) : (
          <FieldsToggle
            mode="lead"
            visible={visibleLeadFields}
            onChange={handleLeadFieldsChange}
          />
        )}
      </div>

      {/* Board */}
      <PipelineBoard
        key={activeTab}
        leadType={activeTab}
        search={search}
        onLeadClick={setSelected}
        visibleCompanyFields={visibleCompanyFields}
        visibleLeadFields={visibleLeadFields}
      />

      {selected && (
        <LeadDetailModal lead={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
