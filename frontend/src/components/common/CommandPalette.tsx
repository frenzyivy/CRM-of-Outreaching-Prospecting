import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Kanban, Users, Mail, Phone, MessageCircle,
  BarChart3, DollarSign, CalendarDays, Plug, User, Building2, X,
} from 'lucide-react'
import { useLeadsData } from '../../hooks/useLeads'
import type { LeadRecord } from '../../types'
import LeadScoreBadge from './LeadScoreBadge'

const pages = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Pipeline', to: '/pipeline', icon: Kanban },
  { label: 'Leads', to: '/leads', icon: Users },
  { label: 'Email', to: '/email', icon: Mail },
  { label: 'Calls', to: '/calls', icon: Phone },
  { label: 'WhatsApp', to: '/whatsapp', icon: MessageCircle },
  { label: 'Performance', to: '/performance', icon: BarChart3 },
  { label: 'Revenue', to: '/revenue', icon: DollarSign },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Integrations', to: '/integrations', icon: Plug },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: leads } = useLeadsData()

  // Global keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const q = query.toLowerCase().trim()

  // Filter pages
  const matchedPages = q
    ? pages.filter((p) => p.label.toLowerCase().includes(q))
    : pages

  // Filter leads (client-side, up to 10 results)
  const matchedLeads: LeadRecord[] = q.length >= 2
    ? (leads || []).filter((l) =>
        l.full_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q)
      ).slice(0, 10)
    : []

  const allResults = [
    ...matchedPages.map((p) => ({ type: 'page' as const, ...p })),
    ...matchedLeads.map((l) => ({ type: 'lead' as const, ...l })),
  ]

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = useCallback((index: number) => {
    const item = allResults[index]
    if (!item) return
    if (item.type === 'page') {
      navigate(item.to)
    } else {
      navigate('/leads')
    }
    setOpen(false)
  }, [allResults, navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(selectedIndex)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search leads, pages..."
            className="flex-1 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {/* Pages */}
          {matchedPages.length > 0 && (
            <>
              <p className="px-4 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pages</p>
              {matchedPages.map((page, i) => {
                const idx = i
                return (
                  <button
                    key={page.to}
                    onClick={() => handleSelect(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      selectedIndex === idx ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <page.icon size={16} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{page.label}</span>
                  </button>
                )
              })}
            </>
          )}

          {/* Leads */}
          {matchedLeads.length > 0 && (
            <>
              <p className="px-4 py-1 mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Leads</p>
              {matchedLeads.map((lead, i) => {
                const idx = matchedPages.length + i
                const name = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                return (
                  <button
                    key={lead.id}
                    onClick={() => handleSelect(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      selectedIndex === idx ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <User size={13} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{name || lead.email}</span>
                        {lead.lead_tier && <LeadScoreBadge score={lead.lead_score ?? 0} tier={lead.lead_tier} />}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{lead.company || lead.email}</p>
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {allResults.length === 0 && (
            <p className="px-4 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">No results found</p>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3 text-[10px] text-slate-400">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  )
}
