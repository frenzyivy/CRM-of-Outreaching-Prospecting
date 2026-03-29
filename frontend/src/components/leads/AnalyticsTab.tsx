import { useState, useMemo } from 'react'
import {
  Database, Building2, Mail, ShieldCheck, Flame, TrendingUp, Snowflake,
  Phone, Percent, Filter, X, Users, User, Camera, ThumbsUp, AtSign
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAllLeads } from '../../hooks/useLeads'
import { isCompanyOnly, hasPersonData } from '../../types'

type GroupBy = 'country' | 'source' | 'stage'

const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'United States', 'us': 'United States', 'u.s.': 'United States',
  'u.s.a.': 'United States', 'united states of america': 'United States',
  'uk': 'United Kingdom', 'u.k.': 'United Kingdom',
  'great britain': 'United Kingdom', 'england': 'United Kingdom',
  'uae': 'United Arab Emirates', 'u.a.e.': 'United Arab Emirates',
  'ksa': 'Saudi Arabia',
}

function normalizeCountry(country: string): string {
  if (!country) return ''
  const lower = country.trim().toLowerCase()
  return COUNTRY_ALIASES[lower] || country.trim()
}

// Pie chart color palettes
const COUNTRY_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316', '#84CC16', '#EF4444', '#14B8A6', '#A855F7']
const TIER_COLORS = { hot: '#EF4444', warm: '#F59E0B', cold: '#06B6D4', unscored: '#CBD5E1' }
const EMAIL_COLORS = { valid: '#22C55E', risky: '#F59E0B', invalid: '#EF4444', unknown: '#94A3B8' }
const COMPANY_SIZE_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316']

export default function AnalyticsTab() {
  const { data: rawLeads, isLoading } = useAllLeads()

  const [countryFilter, setCountryFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('country')

  const leads = useMemo(() =>
    (rawLeads || []).map(l => l.country ? { ...l, country: normalizeCountry(String(l.country)) } : l),
    [rawLeads]
  )

  // Derive filter options
  const countries = useMemo(() => Array.from(new Set(leads.map(l => String(l.country || '')).filter(Boolean))).sort(), [leads])
  const sources = useMemo(() => Array.from(new Set(leads.map(l => String(l.source || '')).filter(Boolean))).sort(), [leads])
  const stages = useMemo(() => {
    const map = new Map<string, string>()
    leads.forEach(l => { if (l.stage) map.set(l.stage, l.stage_label || l.stage) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [leads])
  const statuses = useMemo(() =>
    Array.from(new Set(leads.map(l => String(l.email_status || '').toLowerCase()).filter(Boolean))).sort(),
    [leads]
  )

  // Filter
  const filtered = useMemo(() => leads.filter(l => {
    if (countryFilter !== 'all' && l.country !== countryFilter) return false
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
    if (stageFilter !== 'all' && l.stage !== stageFilter) return false
    if (statusFilter !== 'all' && String(l.email_status || '').toLowerCase() !== statusFilter) return false
    return true
  }), [leads, countryFilter, sourceFilter, stageFilter, statusFilter])

  // Stats
  const stats = useMemo(() => {
    const all = filtered
    const totalLeads = all.filter(l => hasPersonData(l)).length
    const totalCompanies = all.filter(l => isCompanyOnly(l)).length
    const withEmail = all.filter(l => l.email).length
    const valid = all.filter(l => String(l.email_status || '').toLowerCase() === 'valid').length
    const risky = all.filter(l => String(l.email_status || '').toLowerCase() === 'risky').length
    const invalid = all.filter(l => String(l.email_status || '').toLowerCase() === 'invalid').length
    const hot = all.filter(l => l.lead_tier === 'hot').length
    const warm = all.filter(l => l.lead_tier === 'warm').length
    const cold = all.filter(l => l.lead_tier === 'cold').length
    const personLinkedin = all.filter(l => l.linkedin).length
    const companyLinkedin = all.filter(l => l.company_linkedin).length
    const personInstagram = all.filter(l => l.instagram).length
    const personFacebook = all.filter(l => l.facebook).length
    const personTwitter = all.filter(l => l.twitter).length
    const companyInstagram = all.filter(l => l.company_instagram).length
    const companyFacebook = all.filter(l => l.company_facebook).length
    const companyTwitter = all.filter(l => l.company_twitter).length
    const withPhone = all.filter(l => l.phone).length
    const validityRate = withEmail > 0 ? Math.round((valid / withEmail) * 100) : 0

    return {
      totalData: all.length,
      totalLeads,
      totalCompanies,
      withEmail,
      valid, risky, invalid,
      hot, warm, cold,
      personLinkedin, companyLinkedin,
      personInstagram, personFacebook, personTwitter,
      companyInstagram, companyFacebook, companyTwitter,
      withPhone,
      validityRate,
    }
  }, [filtered])

  // Pie chart data
  const countryPieData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach(l => {
      const c = String(l.country || 'Unknown')
      map.set(c, (map.get(c) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  const tierPieData = useMemo(() => {
    const unscored = stats.totalData - stats.hot - stats.warm - stats.cold
    return [
      { name: 'Hot', value: stats.hot, color: TIER_COLORS.hot },
      { name: 'Warm', value: stats.warm, color: TIER_COLORS.warm },
      { name: 'Cold', value: stats.cold, color: TIER_COLORS.cold },
      ...(unscored > 0 ? [{ name: 'Unscored', value: unscored, color: TIER_COLORS.unscored }] : []),
    ].filter(d => d.value > 0)
  }, [stats])

  const emailPieData = useMemo(() => {
    const unknownEmail = stats.withEmail - stats.valid - stats.risky - stats.invalid
    return [
      { name: 'Valid', value: stats.valid, color: EMAIL_COLORS.valid },
      { name: 'Risky', value: stats.risky, color: EMAIL_COLORS.risky },
      { name: 'Invalid', value: stats.invalid, color: EMAIL_COLORS.invalid },
      ...(unknownEmail > 0 ? [{ name: 'Unchecked', value: unknownEmail, color: EMAIL_COLORS.unknown }] : []),
    ].filter(d => d.value > 0)
  }, [stats])

  const companySizePieData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach(l => {
      const size = String(l.company_size || '').trim()
      if (size) map.set(size, (map.get(size) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered])

  // Breakdown table
  const breakdown = useMemo(() => {
    const groups = new Map<string, {
      label: string; total: number; withEmail: number; valid: number; risky: number
      hot: number; warm: number; cold: number; personLi: number; companyLi: number; withPhone: number
    }>()

    filtered.forEach(l => {
      let key = '', label = ''
      if (groupBy === 'country') { key = String(l.country || '(Unknown)'); label = key }
      else if (groupBy === 'source') { key = String(l.source || '(Unknown)'); label = key }
      else { key = l.stage || '(Unknown)'; label = l.stage_label || l.stage || '(Unknown)' }

      if (!groups.has(key)) {
        groups.set(key, { label, total: 0, withEmail: 0, valid: 0, risky: 0, hot: 0, warm: 0, cold: 0, personLi: 0, companyLi: 0, withPhone: 0 })
      }
      const g = groups.get(key)!
      g.total++
      if (l.email) g.withEmail++
      if (String(l.email_status || '').toLowerCase() === 'valid') g.valid++
      if (String(l.email_status || '').toLowerCase() === 'risky') g.risky++
      if (l.lead_tier === 'hot') g.hot++
      if (l.lead_tier === 'warm') g.warm++
      if (l.lead_tier === 'cold') g.cold++
      if (l.linkedin) g.personLi++
      if (l.company_linkedin) g.companyLi++
      if (l.phone) g.withPhone++
    })

    return Array.from(groups.values()).sort((a, b) => b.total - a.total)
  }, [filtered, groupBy])

  const activeFilterCount = [countryFilter, sourceFilter, stageFilter, statusFilter].filter(f => f !== 'all').length

  const clearAllFilters = () => {
    setCountryFilter('all'); setSourceFilter('all'); setStageFilter('all'); setStatusFilter('all')
  }

  if (isLoading) return <div className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96" />

  return (
    <div className="space-y-4">
      {/* Row 1: Data Overview */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Database} color="blue" label="Total Data" value={stats.totalData} subtitle="unique records" />
        <StatCard icon={Users} color="indigo" label="Total Leads" value={stats.totalLeads} subtitle="with person data" />
        <StatCard icon={Building2} color="slate" label="Company Only" value={stats.totalCompanies} subtitle="no person data" />
        <StatCard icon={Mail} color="sky" label="With Email" value={stats.withEmail} subtitle={`of ${stats.totalData} records`} />
      </div>

      {/* Row 2: Quality & Scoring */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={ShieldCheck} color="green" label="Valid Emails" value={stats.valid} subtitle={stats.risky > 0 ? `${stats.risky} risky` : undefined} />
        <StatCard icon={Flame} color="red" label="Hot Leads" value={stats.hot} />
        <StatCard icon={TrendingUp} color="amber" label="Warm Leads" value={stats.warm} />
        <StatCard icon={Snowflake} color="cyan" label="Cold Leads" value={stats.cold} />
      </div>

      {/* Row 3: LinkedIn split + Phone + Validity */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={User} color="blue" label="Person LinkedIn" value={stats.personLinkedin} />
        <StatCard icon={Building2} color="indigo" label="Company LinkedIn" value={stats.companyLinkedin} />
        <StatCard icon={Phone} color="emerald" label="With Phone" value={stats.withPhone} />
        <StatCard icon={Percent} color="teal" label="Email Validity" value={`${stats.validityRate}%`} subtitle={`${stats.valid} of ${stats.withEmail}`} />
      </div>

      {/* Row 4: Social Media Coverage */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Camera} color="pink" label="Person IG" value={stats.personInstagram} />
        <StatCard icon={ThumbsUp} color="blue" label="Person FB" value={stats.personFacebook} />
        <StatCard icon={AtSign} color="slate" label="Person X" value={stats.personTwitter} />
        <StatCard icon={Camera} color="pink" label="Company IG" value={stats.companyInstagram} />
        <StatCard icon={ThumbsUp} color="blue" label="Company FB" value={stats.companyFacebook} />
        <StatCard icon={AtSign} color="slate" label="Company X" value={stats.companyTwitter} />
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PieChartCard title="Data by Country" data={countryPieData} colors={COUNTRY_COLORS} />
        <PieChartCard title="Lead Tier" data={tierPieData} colors={tierPieData.map(d => d.color)} />
        <PieChartCard title="Email Status" data={emailPieData} colors={emailPieData.map(d => d.color)} />
        <PieChartCard title="Company Size" data={companySizePieData} colors={COMPANY_SIZE_COLORS} />
      </div>

      {/* Filter bar + Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Filter size={13} />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">{activeFilterCount}</span>
            )}
          </div>

          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-slate-600">
            <option value="all">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-slate-600">
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-slate-600">
            <option value="all">All stages</option>
            {stages.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-slate-600">
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>

          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <X size={12} /> Clear all
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium">Group by</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(['country', 'source', 'stage'] as const).map(g => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                    groupBy === g ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600 capitalize">{groupBy}</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Total</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">With Email</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Valid</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Risky</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Hot</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Warm</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Cold</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Person LI</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Co. LI</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdown.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.total}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.withEmail}</td>
                  <td className="px-4 py-3 text-right"><span className="text-green-700 font-medium">{row.valid}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-yellow-600 font-medium">{row.risky}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-red-600 font-medium">{row.hot}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-amber-600 font-medium">{row.warm}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-cyan-600 font-medium">{row.cold}</span></td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.personLi}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.companyLi}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.withPhone}</td>
                </tr>
              ))}
              {breakdown.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">No data found</td></tr>
              )}
            </tbody>
            {breakdown.length > 1 && (
              <tfoot>
                <tr className="bg-slate-50/70 border-t border-slate-200 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right text-slate-800">{breakdown.reduce((s, r) => s + r.total, 0)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{breakdown.reduce((s, r) => s + r.withEmail, 0)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{breakdown.reduce((s, r) => s + r.valid, 0)}</td>
                  <td className="px-4 py-3 text-right text-yellow-600">{breakdown.reduce((s, r) => s + r.risky, 0)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{breakdown.reduce((s, r) => s + r.hot, 0)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{breakdown.reduce((s, r) => s + r.warm, 0)}</td>
                  <td className="px-4 py-3 text-right text-cyan-600">{breakdown.reduce((s, r) => s + r.cold, 0)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{breakdown.reduce((s, r) => s + r.personLi, 0)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{breakdown.reduce((s, r) => s + r.companyLi, 0)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{breakdown.reduce((s, r) => s + r.withPhone, 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Reusable Components ---

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500',    text: 'text-blue-700' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-500',  text: 'text-indigo-700' },
  slate:   { bg: 'bg-slate-50',   icon: 'text-slate-500',   text: 'text-slate-700' },
  sky:     { bg: 'bg-sky-50',     icon: 'text-sky-500',     text: 'text-sky-700' },
  green:   { bg: 'bg-green-50',   icon: 'text-green-500',   text: 'text-green-700' },
  red:     { bg: 'bg-red-50',     icon: 'text-red-500',     text: 'text-red-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   text: 'text-amber-700' },
  cyan:    { bg: 'bg-cyan-50',    icon: 'text-cyan-500',    text: 'text-cyan-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700' },
  purple:  { bg: 'bg-purple-50',  icon: 'text-purple-500',  text: 'text-purple-700' },
  teal:    { bg: 'bg-teal-50',    icon: 'text-teal-500',    text: 'text-teal-700' },
  pink:    { bg: 'bg-pink-50',    icon: 'text-pink-500',    text: 'text-pink-700' },
}

function StatCard({ icon: Icon, color, label, value, subtitle }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string; label: string; value: number | string; subtitle?: string
}) {
  const c = colorMap[color] || colorMap.blue
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
      <div className={`${c.bg} rounded-xl p-2.5`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-xl font-bold ${c.text} mt-0.5`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function PieChartCard({ title, data, colors }: {
  title: string; data: { name: string; value: number }[]; colors: string[]
}) {
  if (data.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const percent = (props.percent as number) || 0
    const name = (props.name as string) || ''
    return percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <h3 className="text-xs font-semibold text-slate-600 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={renderLabel}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown, name: unknown) => [Number(value).toLocaleString(), String(name)]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colors[i % colors.length] }} />
            {d.name}: {d.value.toLocaleString()}
          </div>
        ))}
        {data.length > 6 && <span className="text-[10px] text-slate-400">+{data.length - 6} more</span>}
      </div>
    </div>
  )
}
