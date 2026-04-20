import { useState, useCallback, useMemo } from 'react'
import {
  Mail,
  Eye,
  MessageSquareReply,
  MousePointerClick,
  UserMinus,
  Send,
  RefreshCw,
  AlertTriangle,
  Target,
  CalendarCheck,
  Trophy,
  Globe,
  Users,
  TrendingUp,
  Search,
  ArrowRightLeft,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  useEmailOverview,
  useEmailDaily,
  useEmailCountries,
  useEmailLeads,
  useRefreshEmail,
  useEmailSyncStatus,
  useCampaignDetail,
} from '../../hooks/useEmail'
import OpenIntelligenceTab from './OpenIntelligenceTab'
import type { DateRange } from '../../hooks/useEmail'
import type {
  CampaignAnalytics,
  CountryStat,
  InstantlyLead,
  SequenceStep,
  SpecialtyStat,
} from '../../types'
import SyncTab from './SyncTab'
import { useIntegrationsStatus } from '../../hooks/useIntegrations'

// --------------------------------------------------------------------------
// Date range presets
// --------------------------------------------------------------------------

type RangePreset = '7d' | '30d' | '90d'

function presetToRange(preset: RangePreset): DateRange {
  const end = new Date()
  const start = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  start.setDate(end.getDate() - days)
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  }
}

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return 'Never'
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  color: string
  subtitle?: string
  rate?: number
  rateLabel?: string
}

function StatCard({ title, value, icon: Icon, color, subtitle, rate, rateLabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <span className="text-sm text-slate-500">{title}</span>
        </div>
        {rate !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {rate}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">
        {value.toLocaleString()}
        {rate !== undefined && (
          <span className="text-sm font-normal text-slate-400 ml-1.5">({rate}%)</span>
        )}
      </p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      {rateLabel && <p className="text-xs text-slate-400 mt-1">{rateLabel}</p>}
    </div>
  )
}

// --------------------------------------------------------------------------
// Sync status bar
// --------------------------------------------------------------------------

interface SyncStatusBarProps {
  onRefresh: () => void
  refreshing: boolean
  range: DateRange
}

function SyncStatusBar({ onRefresh, refreshing, range }: SyncStatusBarProps) {
  const { data: syncStatus } = useEmailSyncStatus()

  const isOk = syncStatus?.last_sync_ok ?? null
  const lastAt = syncStatus?.last_sync_at ?? null
  const errors = syncStatus?.errors ?? []
  const relTime = formatRelativeTime(lastAt)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm mb-4 ${
        isOk === false
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
    >
      {isOk === false ? (
        <XCircle size={14} className="text-red-500 shrink-0" />
      ) : (
        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
      )}
      <span className="flex-1">
        {isOk === false ? (
          <>
            Sync failed — {errors[0] ?? 'Unknown error'} &nbsp;|&nbsp; Last attempt: {relTime}
          </>
        ) : (
          <>
            Last synced: <strong>{relTime}</strong>
            &nbsp;|&nbsp; Range:{' '}
            <strong>
              {range.dateFrom} → {range.dateTo}
            </strong>
          </>
        )}
      </span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Syncing…' : 'Sync Now'}
      </button>
    </div>
  )
}

// --------------------------------------------------------------------------
// Date range selector
// --------------------------------------------------------------------------

interface DateRangeSelectorProps {
  active: RangePreset
  onChange: (p: RangePreset) => void
}

function DateRangeSelector({ active, onChange }: DateRangeSelectorProps) {
  const presets: { key: RangePreset; label: string }[] = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
  ]
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            active === p.key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// --------------------------------------------------------------------------
// Sequence step funnel
// --------------------------------------------------------------------------

interface SequenceFunnelProps {
  steps: SequenceStep[]
}

function SequenceFunnel({ steps }: SequenceFunnelProps) {
  if (!steps.length) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
        No sequence step data available.
      </div>
    )
  }

  const chartData = steps.map((s) => ({
    name: `Step ${s.step_number}`,
    Sent: s.emails_sent,
    Opened: s.unique_opens,
    Replied: s.unique_replies,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={52} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Sent" fill="#3b82f6" radius={[0, 2, 2, 0]} />
        <Bar dataKey="Opened" fill="#10b981" radius={[0, 2, 2, 0]} />
        <Bar dataKey="Replied" fill="#8b5cf6" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// --------------------------------------------------------------------------
// Specialty breakdown
// --------------------------------------------------------------------------

interface SpecialtyChartProps {
  specialties: SpecialtyStat[]
}

function SpecialtyChart({ specialties }: SpecialtyChartProps) {
  if (!specialties.length) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
        No specialty data available.
      </div>
    )
  }

  const chartData = specialties.slice(0, 6).map((s) => ({
    name: s.specialty.length > 14 ? s.specialty.slice(0, 14) + '…' : s.specialty,
    Leads: s.total_leads,
    'Open %': s.open_rate,
    'Reply %': s.reply_rate,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Leads" fill="#6366f1" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Open %" fill="#10b981" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Reply %" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// --------------------------------------------------------------------------
// Campaign detail drawer
// --------------------------------------------------------------------------

interface CampaignDetailDrawerProps {
  campaignId: string
  campaignName: string
  range: DateRange
  onClose: () => void
}

function CampaignDetailDrawer({ campaignId, campaignName, range, onClose }: CampaignDetailDrawerProps) {
  const { data, isLoading } = useCampaignDetail(campaignId, range)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[480px] bg-white h-full shadow-2xl overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={16} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{campaignName}</h2>
            <p className="text-xs text-slate-400">Campaign drill-down</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="p-5 space-y-6">
            {data.summary && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Sent', value: data.summary.emails_sent },
                    { label: 'Opens', value: `${data.summary.opens} (${data.summary.open_rate}%)` },
                    { label: 'Replies', value: `${data.summary.replies} (${data.summary.reply_rate}%)` },
                    { label: 'Bounced', value: `${data.summary.bounced} (${data.summary.bounce_rate}%)` },
                    { label: 'Interested', value: data.summary.interested ?? 0 },
                    { label: 'Meetings', value: data.summary.meetings_booked ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-semibold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.sequence_steps.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Sequence Funnel
                </h3>
                <SequenceFunnel steps={data.sequence_steps} />
              </div>
            )}

            {data.daily.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Daily Activity
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.daily}>
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="opened" fill="#10b981" name="Opened" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="replies" fill="#8b5cf6" name="Replied" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-sm">No data available.</div>
        )}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Campaign table
// --------------------------------------------------------------------------

const campaignStatusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Draft: 'bg-slate-100 text-slate-600',
}

interface CampaignTableProps {
  campaigns: CampaignAnalytics[]
  range: DateRange
}

function CampaignTable({ campaigns, range }: CampaignTableProps) {
  const [drillCampaign, setDrillCampaign] = useState<CampaignAnalytics | null>(null)

  const handleDrill = useCallback((c: CampaignAnalytics) => {
    setDrillCampaign(c)
  }, [])

  const handleClose = useCallback(() => setDrillCampaign(null), [])

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Mail size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Campaign Performance</h3>
          <span className="text-xs text-slate-400 ml-auto">{campaigns.length} campaigns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">Campaign</th>
                <th className="text-center px-3 py-3 font-medium">Status</th>
                <th className="text-right px-3 py-3 font-medium">Sent</th>
                <th className="text-right px-3 py-3 font-medium">Open</th>
                <th className="text-right px-3 py-3 font-medium">Reply</th>
                <th className="text-right px-3 py-3 font-medium">Bounce</th>
                <th className="text-right px-3 py-3 font-medium">Interested</th>
                <th className="text-right px-3 py-3 font-medium">Meetings</th>
                <th className="text-right px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => {
                const statusClass =
                  campaignStatusColors[c.status_label] || 'bg-slate-100 text-slate-500'
                return (
                  <tr key={c.campaign_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-[180px] truncate">
                      {c.campaign_name}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                        {c.status_label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">{c.emails_sent}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-emerald-600 font-medium">
                        {c.opens} ({c.open_rate}%)
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-blue-600 font-medium">
                        {c.replies} ({c.reply_rate}%)
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={c.bounce_rate > 5 ? 'text-red-600 font-medium' : 'text-slate-500'}>
                        {c.bounced} ({c.bounce_rate}%)
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-orange-600 font-medium">
                      {c.interested ?? 0}
                    </td>
                    <td className="px-3 py-3 text-right text-indigo-600 font-medium">
                      {c.meetings_booked ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDrill(c)}
                        className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {campaigns.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm">No campaigns found.</div>
        )}
      </div>

      {drillCampaign && (
        <CampaignDetailDrawer
          campaignId={drillCampaign.campaign_id}
          campaignName={drillCampaign.campaign_name}
          range={range}
          onClose={handleClose}
        />
      )}
    </>
  )
}

// --------------------------------------------------------------------------
// Country breakdown table
// --------------------------------------------------------------------------

function CountryTable({ countries }: { countries: CountryStat[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <Globe size={16} className="text-slate-400" />
        <h3 className="text-sm font-medium text-slate-700">Outreach by Country</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-left px-5 py-3 font-medium">Country</th>
              <th className="text-right px-3 py-3 font-medium">Leads</th>
              <th className="text-right px-3 py-3 font-medium">Contacted</th>
              <th className="text-right px-3 py-3 font-medium">Opened</th>
              <th className="text-right px-3 py-3 font-medium">Open %</th>
              <th className="text-right px-3 py-3 font-medium">Replied</th>
              <th className="text-right px-3 py-3 font-medium">Reply %</th>
              <th className="text-right px-3 py-3 font-medium">Interested</th>
              <th className="text-right px-5 py-3 font-medium">Bounced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {countries.map((c) => (
              <tr key={c.country} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-800">{c.country}</td>
                <td className="px-3 py-3 text-right text-slate-600">{c.total_leads}</td>
                <td className="px-3 py-3 text-right text-slate-600">{c.contacted}</td>
                <td className="px-3 py-3 text-right text-slate-600">{c.opened}</td>
                <td className="px-3 py-3 text-right">
                  <span className="text-emerald-600 font-medium">{c.open_rate}%</span>
                </td>
                <td className="px-3 py-3 text-right text-slate-600">{c.replied}</td>
                <td className="px-3 py-3 text-right">
                  <span className="text-blue-600 font-medium">{c.reply_rate}%</span>
                </td>
                <td className="px-3 py-3 text-right text-orange-600">{c.interested}</td>
                <td className="px-5 py-3 text-right text-red-500">{c.bounced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {countries.length === 0 && (
        <div className="p-12 text-center text-slate-400 text-sm">No country data available.</div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Lead contacts table
// --------------------------------------------------------------------------

function LeadTable({ leads }: { leads: InstantlyLead[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads.filter(
      (l) =>
        l.email.toLowerCase().includes(q) ||
        l.first_name.toLowerCase().includes(q) ||
        l.last_name.toLowerCase().includes(q) ||
        l.company_name.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q),
    )
  }, [leads, search])

  const interestColors: Record<string, string> = {
    Interested: 'bg-emerald-100 text-emerald-700',
    'Meeting Booked': 'bg-blue-100 text-blue-700',
    'Meeting Completed': 'bg-indigo-100 text-indigo-700',
    Won: 'bg-green-100 text-green-800',
    'Not Interested': 'bg-red-100 text-red-700',
    'Wrong Person': 'bg-orange-100 text-orange-700',
    Lost: 'bg-red-100 text-red-600',
    'Out of Office': 'bg-amber-100 text-amber-700',
    Lead: 'bg-slate-100 text-slate-500',
  }

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <Users size={16} className="text-slate-400" />
        <h3 className="text-sm font-medium text-slate-700">Lead Contacts</h3>
        <span className="text-xs text-slate-400 ml-1">({leads.length})</span>
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads…"
            value={search}
            onChange={handleSearch}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
          />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr className="text-slate-500 text-xs">
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-3 py-3 font-medium">Email</th>
              <th className="text-left px-3 py-3 font-medium">Company</th>
              <th className="text-left px-3 py-3 font-medium">Country</th>
              <th className="text-center px-3 py-3 font-medium">Opens</th>
              <th className="text-center px-3 py-3 font-medium">Replies</th>
              <th className="text-center px-3 py-3 font-medium">Clicks</th>
              <th className="text-center px-5 py-3 font-medium">Interest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 100).map((l) => {
              const intClass = interestColors[l.interest_label] ?? interestColors.Lead
              return (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-2.5 text-slate-800 font-medium whitespace-nowrap">
                    {l.first_name} {l.last_name}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs">{l.email}</td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[140px] truncate">
                    {l.company_name || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{l.country}</td>
                  <td className="px-3 py-2.5 text-center">
                    {l.email_open_count > 0 ? (
                      <span className="text-emerald-600 font-medium">{l.email_open_count}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {l.email_reply_count > 0 ? (
                      <span className="text-blue-600 font-medium">{l.email_reply_count}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {l.email_click_count > 0 ? (
                      <span className="text-purple-600 font-medium">{l.email_click_count}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${intClass}`}>
                      {l.interest_label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-sm">No leads found.</div>
      )}
      {filtered.length > 100 && (
        <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
          Showing first 100 of {filtered.length} leads. Use search to narrow down.
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Pie chart colours
// --------------------------------------------------------------------------

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

interface Props {}

export default function InstantlyTab(_props: Props) {
  const navigate = useNavigate()
  const { data: intStatus } = useIntegrationsStatus()
  const instantlyConnected = intStatus?.instantly?.connected ?? true

  const [activeTab, setActiveTab] = useState<'analytics' | 'sync' | 'open-intelligence'>('analytics')
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d')
  const [refreshing, setRefreshing] = useState(false)

  const range = useMemo(() => presetToRange(rangePreset), [rangePreset])

  const { data: overviewData, isLoading: ol } = useEmailOverview(range)
  const { data: dailyData, isLoading: dl } = useEmailDaily(range)
  const { data: countryData, isLoading: cl } = useEmailCountries(range)
  const { data: leadsData, isLoading: ll } = useEmailLeads(range)
  const refreshEmail = useRefreshEmail(range)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshEmail()
    } finally {
      setRefreshing(false)
    }
  }, [refreshEmail])

  const handleRangeChange = useCallback((p: RangePreset) => {
    setRangePreset(p)
  }, [])

  if (!instantlyConnected) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={28} className="text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect Instantly.ai</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Connect your Instantly.ai account to track campaigns, opens, replies, and outreach analytics.
        </p>
        <button
          onClick={() => navigate('/integrations')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Settings size={14} />
          Configure in Integrations
        </button>
      </div>
    )
  }

  const isLoading = ol || dl || cl || ll

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  const overview = overviewData?.overview
  const campaigns = overviewData?.campaign_analytics ?? []
  const sequenceSteps = overviewData?.sequence_steps ?? []
  const daily = dailyData?.daily ?? []
  const countries = countryData?.country_stats ?? []
  const leads = leadsData?.leads ?? []
  const specialties = leadsData?.specialty_stats ?? []
  const breakdown = leadsData?.lead_status_breakdown
  const hasError =
    overviewData?.error || dailyData?.error || countryData?.error || leadsData?.error

  const interestData = breakdown?.by_interest
    ? Object.entries(breakdown.by_interest).map(([name, value]) => ({ name, value }))
    : []

  const topCountries = countries.slice(0, 8).map((c) => ({ name: c.country, value: c.total_leads }))

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={15} />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sync'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowRightLeft size={15} />
          Sync Leads
        </button>
        <button
          onClick={() => setActiveTab('open-intelligence')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'open-intelligence'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Eye size={15} />
          Open Intelligence
        </button>
      </div>

      {activeTab === 'sync' ? (
        <SyncTab />
      ) : activeTab === 'open-intelligence' ? (
        <OpenIntelligenceTab />
      ) : (
        <>
          {hasError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
              <AlertTriangle size={14} />
              {overviewData?.error ?? dailyData?.error ?? countryData?.error ?? leadsData?.error}
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center justify-between mb-4">
            <DateRangeSelector active={rangePreset} onChange={handleRangeChange} />
          </div>

          {/* Sync status bar */}
          <SyncStatusBar onRefresh={handleRefresh} refreshing={refreshing} range={range} />

          {/* Tier 1 — Core sending KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <StatCard
              title="Emails Sent"
              value={overview?.emails_sent ?? 0}
              icon={Send}
              color="bg-blue-500"
              subtitle={`${overview?.contacted ?? 0} contacted`}
            />
            <StatCard
              title="Unique Opens"
              value={overview?.unique_opens ?? 0}
              icon={Eye}
              color="bg-emerald-500"
              rate={overview?.open_rate ?? 0}
            />
            <StatCard
              title="Replies"
              value={overview?.unique_replies ?? 0}
              icon={MessageSquareReply}
              color="bg-purple-500"
              rate={overview?.reply_rate ?? 0}
            />
            <StatCard
              title="Link Clicks"
              value={overview?.unique_clicks ?? 0}
              icon={MousePointerClick}
              color="bg-cyan-500"
              rate={overview?.click_rate ?? 0}
            />
            <StatCard
              title="Bounced"
              value={overview?.bounce_count ?? 0}
              icon={AlertTriangle}
              color="bg-red-500"
              rate={overview?.bounce_rate ?? 0}
            />
            <StatCard
              title="Unsubscribed"
              value={overview?.unsubscribed ?? 0}
              icon={UserMinus}
              color="bg-orange-500"
              rate={overview?.unsub_rate ?? 0}
            />
          </div>

          {/* Tier 2 — Pipeline KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4 flex items-center gap-3">
              <Target size={20} className="text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Interested</p>
                <p className="text-lg font-bold text-slate-800">{overview?.total_interested ?? 0}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4 flex items-center gap-3">
              <CalendarCheck size={20} className="text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Meetings Booked</p>
                <p className="text-lg font-bold text-slate-800">{overview?.total_meeting_booked ?? 0}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-4 flex items-center gap-3">
              <Trophy size={20} className="text-emerald-500" />
              <div>
                <p className="text-xs text-slate-500">Closed / Won</p>
                <p className="text-lg font-bold text-slate-800">{overview?.total_closed ?? 0}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-4 flex items-center gap-3">
              <TrendingUp size={20} className="text-purple-500" />
              <div>
                <p className="text-xs text-slate-500">Opportunities</p>
                <p className="text-lg font-bold text-slate-800">{overview?.total_opportunities ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Charts row 1: Daily activity + Interest breakdown + Country pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4">
                Daily Email Activity ({rangePreset === '7d' ? '7' : rangePreset === '30d' ? '30' : '90'} days)
              </h3>
              {daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      labelFormatter={(v) => `Date: ${String(v ?? '')}`}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="opened" fill="#10b981" name="Opened" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="replies" fill="#8b5cf6" name="Replies" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="bounced" fill="#ef4444" name="Bounced" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  No daily data available.
                </div>
              )}
            </div>
            <div className="space-y-4">
              {interestData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Lead Interest Breakdown</h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={interestData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {interestData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                    {interestData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {topCountries.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Leads by Country</h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={topCountries}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {topCountries.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                    {topCountries.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts row 2: Sequence funnel + Specialty breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700">Sequence Step Funnel</h3>
              </div>
              <SequenceFunnel steps={sequenceSteps} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope size={15} className="text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700">By Specialty</h3>
              </div>
              <SpecialtyChart specialties={specialties} />
            </div>
          </div>

          {/* Tables */}
          <div className="mb-6">
            <CampaignTable campaigns={campaigns} range={range} />
          </div>
          <div className="mb-6">
            <CountryTable countries={countries} />
          </div>
          <div className="mb-6">
            <LeadTable leads={leads} />
          </div>
        </>
      )}
    </div>
  )
}
