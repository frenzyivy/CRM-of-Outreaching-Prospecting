import { Building2, Mail, MapPin, Users, Phone, Link2, BarChart2, Copy } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAnalytics } from '../../hooks/useAnalytics'

// Color palettes
const COUNTRY_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316', '#84CC16', '#EF4444', '#14B8A6', '#A855F7', '#CBD5E1']
const EMAIL_STATUS_COLORS: Record<string, string> = {
  valid: '#22C55E', risky: '#F59E0B', invalid: '#EF4444', unchecked: '#94A3B8',
}
const QUALITY_COLORS: Record<string, string> = {
  excellent: '#22C55E', good: '#3B82F6', partial: '#F59E0B', company_only: '#6366F1', poor: '#94A3B8',
}
const SIZE_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316', '#94A3B8']

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500',    text: 'text-blue-700' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-500',  text: 'text-indigo-700' },
  sky:     { bg: 'bg-sky-50',     icon: 'text-sky-500',     text: 'text-sky-700' },
  green:   { bg: 'bg-green-50',   icon: 'text-green-500',   text: 'text-green-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   text: 'text-amber-700' },
  teal:    { bg: 'bg-teal-50',    icon: 'text-teal-500',    text: 'text-teal-700' },
  slate:   { bg: 'bg-slate-50',   icon: 'text-slate-500',   text: 'text-slate-700' },
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
        <p className={`text-xl font-bold ${c.text} mt-0.5`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function PieChartCard({ title, data, colors }: {
  title: string
  data: { name: string; value: number }[]
  colors: string[]
}) {
  if (!data || data.length === 0) return null

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

export default function AnalyticsTab() {
  const { data, isLoading, error } = useAnalytics()

  if (isLoading) return <div className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96" />
  if (error) return (
    <div className="bg-white rounded-2xl border border-red-100 p-6 text-center">
      <p className="text-sm text-red-500 font-medium">Failed to load analytics</p>
      <p className="text-xs text-slate-400 mt-1">Make sure the <code>get_analytics_summary</code> RPC is deployed in Supabase.</p>
    </div>
  )
  if (!data) return null

  // --- Derived pie chart data ---
  const countryPieData = (data.country || [])
    .map(d => ({ name: d.country, value: d.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)

  const qualityPieData = (data.lead_quality || []).map(d => ({
    name: d.tier.charAt(0).toUpperCase() + d.tier.slice(1).replace('_', ' '),
    value: d.count,
    color: QUALITY_COLORS[d.tier] || '#94A3B8',
  }))

  const emailStatusPieData = (data.email_status || []).map(d => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.count,
    color: EMAIL_STATUS_COLORS[d.status.toLowerCase()] || '#94A3B8',
  }))

  const companySizePieData = (data.company_size || [])
    .map(d => ({ name: d.size, value: d.count }))
    .sort((a, b) => b.value - a.value)

  // --- Completeness bar buckets ---
  const bucketOrder = ['excellent', 'good', 'partial', 'poor']
  const bucketColors: Record<string, string> = {
    excellent: '#22C55E', good: '#3B82F6', partial: '#F59E0B', poor: '#EF4444',
  }
  const buckets = bucketOrder.map(b => {
    const found = (data.completeness_buckets || []).find(x => x.bucket === b)
    return { label: b, count: found?.count || 0 }
  })
  const totalRows = data.total_rows || 1
  const bucketTotal = buckets.reduce((s, b) => s + b.count, 0) || 1

  // --- Duplicate stats ---
  const dup = data.duplicates || { total_lead_rows: 0, unique_lead_count: 0, unique_company_count: 0, total_rows: 0 }
  const emailDuplicates = dup.total_lead_rows - dup.unique_lead_count
  const companyDuplicates = dup.total_rows - dup.unique_company_count

  return (
    <div className="space-y-4">
      {/* Row 1: Primary Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Building2} color="indigo" label="Unique Companies" value={data.unique_companies} subtitle="deduped by domain/name" />
        <StatCard icon={MapPin}     color="sky"    label="Total Locations"  value={data.total_locations}  subtitle="city + company combos" />
        <StatCard icon={Users}      color="blue"   label="Unique Leads"     value={data.unique_leads}     subtitle="deduped by email" />
        <StatCard icon={Mail}       color="teal"   label="Total Emails"     value={data.total_unique_emails} subtitle="all unique emails" />
      </div>

      {/* Row 2: Email & Richness */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Phone}    color="emerald" label="Leads w/ Phone"      value={data.leads_with_phone}    subtitle="unique leads" />
        <StatCard icon={Link2}    color="blue"    label="Leads w/ LinkedIn"   value={data.leads_with_linkedin} subtitle="unique leads" />
        <StatCard icon={Phone}    color="slate"   label="Companies w/ Phone"  value={data.companies_with_phone} subtitle="unique companies" />
        <StatCard
          icon={BarChart2}
          color={data.avg_completeness >= 60 ? 'green' : 'amber'}
          label="Data Completeness"
          value={`${data.avg_completeness}%`}
          subtitle="avg across all 11 fields"
        />
      </div>

      {/* Row 3: Completeness bar + Duplicate detection */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completeness stacked bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-xs font-semibold text-slate-600 mb-3">Data Completeness Distribution</h3>
          <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
            {buckets.map(b => {
              const pct = (b.count / bucketTotal) * 100
              if (pct < 0.5) return null
              return (
                <div
                  key={b.label}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: bucketColors[b.label] }}
                  title={`${b.label}: ${b.count.toLocaleString()} (${pct.toFixed(1)}%)`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {buckets.map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: bucketColors[b.label] }} />
                <span className="capitalize font-medium">{b.label}</span>
                <span className="text-slate-400">{b.count.toLocaleString()}</span>
                <span className="text-slate-300">({((b.count / bucketTotal) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Duplicate detection */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
            <Copy size={13} className="text-slate-400" />
            Duplicate Detection
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total rows in database</p>
                <p className="text-lg font-bold text-slate-800">{dup.total_rows.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Email Dupes</p>
                <p className="text-base font-bold text-blue-700 mt-0.5">{emailDuplicates.toLocaleString()}</p>
                <p className="text-[10px] text-blue-400 mt-0.5">
                  {dup.total_lead_rows.toLocaleString()} rows → {dup.unique_lead_count.toLocaleString()} unique
                </p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wide">Company Dupes</p>
                <p className="text-base font-bold text-indigo-700 mt-0.5">{companyDuplicates.toLocaleString()}</p>
                <p className="text-[10px] text-indigo-400 mt-0.5">
                  {totalRows.toLocaleString()} rows → {dup.unique_company_count.toLocaleString()} unique
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Pie charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PieChartCard
          title="Data by Country"
          data={countryPieData}
          colors={COUNTRY_COLORS}
        />
        <PieChartCard
          title="Lead Quality Tier"
          data={qualityPieData}
          colors={qualityPieData.map(d => d.color)}
        />
        <PieChartCard
          title="Email Status"
          data={emailStatusPieData}
          colors={emailStatusPieData.map(d => d.color)}
        />
        <PieChartCard
          title="Company Size"
          data={companySizePieData}
          colors={SIZE_COLORS}
        />
      </div>
    </div>
  )
}
