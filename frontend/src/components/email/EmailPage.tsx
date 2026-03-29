import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import Header from '../layout/Header'
import {
  useEmailOverview,
  useEmailDaily,
  useEmailCountries,
  useEmailLeads,
  useRefreshEmail,
} from '../../hooks/useEmail'
import type { CampaignAnalytics, CountryStat, InstantlyLead } from '../../types'
import SyncTab from './SyncTab'
import { useIntegrationsStatus } from '../../hooks/useIntegrations'

// --- Stat Card ---
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  rate,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
  rate?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <span className="text-sm text-slate-500">{title}</span>
        </div>
        {rate && (
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {rate}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

// --- Campaign comparison table ---
const campaignStatusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Draft: 'bg-slate-100 text-slate-600',
}

function CampaignTable({ campaigns }: { campaigns: CampaignAnalytics[] }) {
  return (
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
              <th className="text-right px-3 py-3 font-medium">Open %</th>
              <th className="text-right px-3 py-3 font-medium">Reply %</th>
              <th className="text-right px-3 py-3 font-medium">Click %</th>
              <th className="text-right px-3 py-3 font-medium">Bounce %</th>
              <th className="text-right px-5 py-3 font-medium">Opps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => {
              const statusClass =
                campaignStatusColors[c.status_label] || 'bg-slate-100 text-slate-500'
              return (
                <tr key={c.campaign_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                    {c.campaign_name}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}
                    >
                      {c.status_label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">{c.emails_sent}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-emerald-600 font-medium">{c.open_rate}%</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-blue-600 font-medium">{c.reply_rate}%</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-purple-600 font-medium">{c.click_rate}%</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={c.bounce_rate > 5 ? 'text-red-600 font-medium' : 'text-slate-500'}>
                      {c.bounce_rate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{c.opportunities}</td>
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
  )
}

// --- Country breakdown table ---
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
        <div className="p-12 text-center text-slate-400 text-sm">
          No country data available. Country is pulled from lead custom fields.
        </div>
      )}
    </div>
  )
}

// --- Lead contacts table ---
function LeadTable({ leads }: { leads: InstantlyLead[] }) {
  const [search, setSearch] = useState('')
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    return (
      l.email.toLowerCase().includes(q) ||
      l.first_name.toLowerCase().includes(q) ||
      l.last_name.toLowerCase().includes(q) ||
      l.company_name.toLowerCase().includes(q) ||
      l.country.toLowerCase().includes(q)
    )
  })

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
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              const intClass = interestColors[l.interest_label] || interestColors.Lead
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

// --- Pie chart colors ---
const PIE_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

// --- Main Page ---
export default function EmailPage() {
  const navigate = useNavigate()
  const { data: intStatus } = useIntegrationsStatus()
  const instantlyConnected = intStatus?.instantly?.connected ?? true // default true while loading

  const { data: overviewData, isLoading: ol } = useEmailOverview()
  const { data: dailyData, isLoading: dl } = useEmailDaily()
  const { data: countryData, isLoading: cl } = useEmailCountries()
  const { data: leadsData, isLoading: ll } = useEmailLeads()
  const refreshEmail = useRefreshEmail()
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'analytics' | 'sync'>('analytics')

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshEmail()
    } finally {
      setRefreshing(false)
    }
  }

  // Show setup screen when Instantly.ai is disconnected
  if (!instantlyConnected) {
    return (
      <div>
        <Header title="Email" subtitle="Campaign performance & outreach analytics" />
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Set Up Your Email Integration
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Connect your Instantly.ai account to start tracking email campaigns,
            opens, replies, bounces, and outreach analytics.
          </p>
          <button
            onClick={() => navigate('/integrations')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Settings size={14} />
            Configure in Integrations
          </button>
        </div>
      </div>
    )
  }

  if (ol || dl || cl || ll) {
    return (
      <div>
        <Header title="Email" subtitle="Campaign performance & outreach analytics" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const overview = overviewData?.overview
  const campaigns = overviewData?.campaign_analytics || []
  const daily = dailyData?.daily || []
  const countries = countryData?.country_stats || []
  const leads = leadsData?.leads || []
  const breakdown = leadsData?.lead_status_breakdown
  const hasError = overviewData?.error || dailyData?.error || countryData?.error || leadsData?.error

  // Pie chart data for interest breakdown
  const interestData = breakdown?.by_interest
    ? Object.entries(breakdown.by_interest).map(([name, value]) => ({ name, value }))
    : []

  // Top countries for the pie chart
  const topCountries = countries.slice(0, 8).map((c) => ({
    name: c.country,
    value: c.total_leads,
  }))

  return (
    <div>
      <Header title="Email" subtitle="Campaign performance & outreach analytics" />

      {/* Tab bar */}
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
      </div>

      {activeTab === 'sync' ? (
        <SyncTab />
      ) : (
      <>

      {hasError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle size={14} />
          {overviewData?.error || dailyData?.error || countryData?.error || leadsData?.error}
        </div>
      )}

      {/* Sync button + last synced */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">Auto-syncs every 60 seconds from Instantly.ai</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Row 1: Overview stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Emails Sent"
          value={overview?.emails_sent?.toLocaleString() ?? 0}
          icon={Send}
          color="bg-blue-500"
          subtitle={`${overview?.contacted ?? 0} contacted`}
        />
        <StatCard
          title="Unique Opens"
          value={overview?.unique_opens?.toLocaleString() ?? 0}
          icon={Eye}
          color="bg-emerald-500"
          rate={`${overview?.open_rate ?? 0}%`}
        />
        <StatCard
          title="Replies"
          value={overview?.unique_replies?.toLocaleString() ?? 0}
          icon={MessageSquareReply}
          color="bg-purple-500"
          rate={`${overview?.reply_rate ?? 0}%`}
        />
        <StatCard
          title="Link Clicks"
          value={overview?.unique_clicks?.toLocaleString() ?? 0}
          icon={MousePointerClick}
          color="bg-cyan-500"
          rate={`${overview?.click_rate ?? 0}%`}
        />
        <StatCard
          title="Bounced"
          value={overview?.bounce_count?.toLocaleString() ?? 0}
          icon={AlertTriangle}
          color="bg-red-500"
          rate={`${overview?.bounce_rate ?? 0}%`}
        />
        <StatCard
          title="Unsubscribed"
          value={overview?.unsubscribed?.toLocaleString() ?? 0}
          icon={UserMinus}
          color="bg-orange-500"
        />
      </div>

      {/* Row 2: Funnel mini-cards */}
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

      {/* Row 3: Daily chart + Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Daily Email Activity (30 days)</h3>
          {daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={(v) => `Date: ${v}`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[2, 2, 0, 0]} />
                <Bar dataKey="opened" fill="#10b981" name="Opened" radius={[2, 2, 0, 0]} />
                <Bar dataKey="replies" fill="#8b5cf6" name="Replies" radius={[2, 2, 0, 0]} />
                <Bar dataKey="bounced" fill="#ef4444" name="Bounced" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No daily data available yet.
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Interest breakdown pie */}
          {interestData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Lead Interest Breakdown</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={interestData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
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

          {/* Top countries pie */}
          {topCountries.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Leads by Country</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={topCountries}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
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

      {/* Row 4: Campaign comparison */}
      <div className="mb-6">
        <CampaignTable campaigns={campaigns} />
      </div>

      {/* Row 5: Country breakdown */}
      <div className="mb-6">
        <CountryTable countries={countries} />
      </div>

      {/* Row 6: Lead contacts */}
      <div className="mb-6">
        <LeadTable leads={leads} />
      </div>

      </>
      )}
    </div>
  )
}
