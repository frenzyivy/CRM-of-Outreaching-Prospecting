import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  Trophy,
  AlertTriangle,
  Flame,
  Tag,
  X,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Clock,
  Globe,
  Layers,
  Zap,
  Info,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  useSubjectLines,
  useAngles,
  useStepPerformance,
  useTimeHeatmap,
  usePeakHours,
  useInsights,
  useHotLeads,
  useTags,
  useCreateTag,
  useUpdateTag,
  useSyncOpenEvents,
} from '../../hooks/useOpenIntelligence'
import { useEmailOverview } from '../../hooks/useEmail'
import type { OpenIntelligenceFilters, SubjectLineRow, TemplateTag } from '../../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANGLE_OPTIONS = [
  'untagged',
  'pain_point',
  'social_proof',
  'case_study',
  'direct_offer',
  'curiosity',
  'value_first',
  'follow_up_soft',
  'follow_up_direct',
  'breakup',
]

const ANGLE_COLORS: Record<string, string> = {
  pain_point:       'bg-red-100 text-red-700',
  social_proof:     'bg-blue-100 text-blue-700',
  case_study:       'bg-purple-100 text-purple-700',
  direct_offer:     'bg-green-100 text-green-700',
  curiosity:        'bg-yellow-100 text-yellow-700',
  value_first:      'bg-teal-100 text-teal-700',
  follow_up_soft:   'bg-orange-100 text-orange-700',
  follow_up_direct: 'bg-pink-100 text-pink-700',
  breakup:          'bg-gray-100 text-gray-600',
  untagged:         'bg-slate-100 text-slate-500',
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COUNTRIES = ['Poland', 'Spain', 'Germany']

// ---------------------------------------------------------------------------
// AngleTagDrawer — slides in when a subject line row is clicked
// ---------------------------------------------------------------------------

interface AngleTagDrawerProps {
  row: SubjectLineRow
  existingTag: TemplateTag | null
  onClose: () => void
}

function AngleTagDrawer({ row, existingTag, onClose }: AngleTagDrawerProps) {
  const [angle, setAngle] = useState(existingTag?.body_angle ?? 'untagged')
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const saving = createTag.isPending || updateTag.isPending

  function handleSave() {
    if (existingTag) {
      updateTag.mutate(
        { id: existingTag.id, updates: { body_angle: angle } },
        { onSuccess: onClose },
      )
    } else {
      createTag.mutate(
        {
          campaign_id:  row.campaign_id,
          step_number:  row.step_number,
          variant_id:   row.variant_id,
          subject_line: row.subject_line,
          body_angle:   angle,
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-80 bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <Tag size={15} />
            Assign Body Angle
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Subject line preview */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 mb-1">
            Step {row.step_number} · Variant {row.variant_id} · {row.campaign_name || row.campaign_id}
          </p>
          <p className="text-sm text-slate-800 font-medium leading-snug">
            "{row.subject_line || '(no subject)'}"
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {row.unique_opens} unique opens · {row.total_opens} total
          </p>
        </div>

        {/* Angle selector */}
        <div className="flex-1 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase mb-3">Select angle</p>
          <div className="flex flex-col gap-2">
            {ANGLE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setAngle(opt)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                  angle === opt
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${ANGLE_COLORS[opt] ?? 'bg-slate-100 text-slate-500'}`}>
                  {opt}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save Tag'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FiltersBar
// ---------------------------------------------------------------------------

interface FiltersBarProps {
  filters: Partial<OpenIntelligenceFilters>
  onChange: (f: Partial<OpenIntelligenceFilters>) => void
  campaigns: { campaign_id: string; campaign_name: string }[]
}

function FiltersBar({ filters, onChange, campaigns }: FiltersBarProps) {
  const presets: { label: string; days: number }[] = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
  ]

  function applyPreset(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    onChange({
      ...filters,
      dateFrom: from.toISOString().slice(0, 10),
      dateTo:   to.toISOString().slice(0, 10),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
      {/* Date presets */}
      <div className="flex gap-1">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.days)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Country */}
      <select
        value={filters.country ?? ''}
        onChange={e => onChange({ ...filters, country: e.target.value || null })}
        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-600"
      >
        <option value="">All countries</option>
        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Specialty */}
      <select
        value={filters.specialty ?? ''}
        onChange={e => onChange({ ...filters, specialty: e.target.value || null })}
        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-600"
      >
        <option value="">All specialties</option>
        <option value="dentist">Dentist</option>
        <option value="dermatologist">Dermatologist</option>
      </select>

      {/* Campaign */}
      <select
        value={filters.campaignId ?? ''}
        onChange={e => onChange({ ...filters, campaignId: e.target.value || null })}
        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-600"
      >
        <option value="">All campaigns</option>
        {campaigns.map(c => (
          <option key={c.campaign_id} value={c.campaign_id}>
            {c.campaign_name || c.campaign_id}
          </option>
        ))}
      </select>

      {/* Clear */}
      {(filters.country || filters.specialty || filters.campaignId) && (
        <button
          onClick={() => onChange({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InsightsSummaryCard
// ---------------------------------------------------------------------------

const INSIGHT_ICONS: Record<string, ReactNode> = {
  peak_hour:   <Clock size={14} className="text-blue-500" />,
  top_country: <Globe size={14} className="text-green-500" />,
  best_angle:  <Zap size={14} className="text-yellow-500" />,
  hot_leads:   <Flame size={14} className="text-red-500" />,
  untagged:    <Tag size={14} className="text-slate-400" />,
  info:        <Info size={14} className="text-slate-400" />,
}

function InsightsSummaryCard({ filters }: { filters: Partial<OpenIntelligenceFilters> }) {
  const { data } = useInsights(filters)
  const insights = data?.insights ?? []

  if (!insights.length) return null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
        <Zap size={15} className="text-yellow-500" />
        Open Intelligence Insights
      </div>
      <div className="flex flex-col gap-2">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="mt-0.5 shrink-0">{INSIGHT_ICONS[ins.type] ?? <Info size={14} />}</span>
            <span>{ins.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HotLeadsAlert
// ---------------------------------------------------------------------------

function HotLeadsAlert() {
  const { data } = useHotLeads()
  const count = data?.items?.length ?? 0
  if (!count) return null

  return (
    <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
      <Flame size={16} className="text-amber-500 shrink-0" />
      <span>
        <strong>{count} lead{count !== 1 ? 's' : ''}</strong> re-opened emails 3+ times — high engagement signal. Prioritise for personal follow-up.
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubjectLineLeaderboard
// ---------------------------------------------------------------------------

type SortKey = 'unique_opens' | 'total_opens' | 're_open_rate'

function SubjectLineLeaderboard({
  filters,
  onRowClick,
}: {
  filters: Partial<OpenIntelligenceFilters>
  onRowClick: (row: SubjectLineRow) => void
}) {
  const [sortBy, setSortBy] = useState<SortKey>('unique_opens')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading } = useSubjectLines({ ...filters, sortBy, sortOrder })
  const items = data?.items ?? []
  const maxOpens = useMemo(() => Math.max(...items.map(r => r.unique_opens), 1), [items])

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  function SortBtn({ col }: { col: SortKey }) {
    const active = sortBy === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-0.5 text-xs font-medium transition-colors ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
      >
        {col === 'unique_opens' ? 'Unique' : col === 'total_opens' ? 'Total' : 'Re-opens'}
        {active ? (sortOrder === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null}
      </button>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <Trophy size={15} className="text-yellow-500" />
          Subject Line Leaderboard
        </div>
        <div className="flex gap-3">
          <SortBtn col="unique_opens" />
          <SortBtn col="total_opens" />
          <SortBtn col="re_open_rate" />
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-slate-400 py-4 text-center">
          No open events recorded yet. Opens are captured via Instantly webhook.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((row, idx) => {
          const pct = Math.round((row.unique_opens / maxOpens) * 100)
          const isTop = idx === 0
          const isBottom = idx === items.length - 1 && items.length > 1
          return (
            <div
              key={`${row.campaign_id}-${row.step_number}-${row.variant_id}`}
              onClick={() => onRowClick(row)}
              className="group cursor-pointer border border-slate-100 rounded-lg px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isTop && <Trophy size={13} className="text-yellow-500 shrink-0" />}
                  {isBottom && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                  {!isTop && !isBottom && <span className="text-xs text-slate-400 w-4 shrink-0">#{idx + 1}</span>}
                  <span className="text-sm font-medium text-slate-700 truncate">
                    "{row.subject_line || '(no subject)'}"
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ANGLE_COLORS[row.body_angle] ?? 'bg-slate-100 text-slate-500'}`}>
                    {row.body_angle}
                  </span>
                  <Tag size={12} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                {row.campaign_name || row.campaign_id} · Step {row.step_number} · Variant {row.variant_id}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {row.unique_opens} opens · {row.total_opens} total
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BodyAnglePerformance
// ---------------------------------------------------------------------------

function BodyAnglePerformance({ filters }: { filters: Partial<OpenIntelligenceFilters> }) {
  const { data, isLoading } = useAngles(filters)
  const items = data?.items ?? []

  if (isLoading) return null
  if (!items.length) return null

  const chartData = items.map(r => ({
    name: r.body_angle,
    unique: r.unique_opens,
    total: r.total_opens,
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold text-sm">
        <BarChart3 size={15} className="text-purple-500" />
        Body Angle Performance
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={75}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(val, name) => [val as number, name === 'unique' ? 'Unique opens' : 'Total opens']}
          />
          <Bar dataKey="unique" name="unique" radius={[0, 4, 4, 0]} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SequenceStepBreakdown
// ---------------------------------------------------------------------------

function SequenceStepBreakdown({ filters }: { filters: Partial<OpenIntelligenceFilters> }) {
  const { data, isLoading } = useStepPerformance(filters)
  const items = data?.items ?? []

  if (isLoading || !items.length) return null

  const chartData = items.map(r => ({
    name: `Step ${r.step_number}`,
    sent:   r.emails_sent || 0,
    opened: r.unique_opens,
    rate:   r.open_rate ?? 0,
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold text-sm">
        <Layers size={15} className="text-teal-500" />
        Sequence Step Engagement
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(val, name) => [val as number, name === 'sent' ? 'Sent' : 'Opened']}
          />
          <Bar dataKey="sent"   name="sent"   fill="#cbd5e1" radius={[3, 3, 0, 0]} />
          <Bar dataKey="opened" name="opened" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 mt-3">
        {items.map((r, i) => {
          const prev = items[i - 1]
          const drop = prev && prev.open_rate && r.open_rate
            ? (r.open_rate - prev.open_rate).toFixed(1)
            : null
          return (
            <div key={r.step_number} className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Step {r.step_number}: {r.unique_opens} opened{r.emails_sent ? ` / ${r.emails_sent} sent` : ''}</span>
              {drop && <span className={Number(drop) < 0 ? 'text-red-500' : 'text-green-500'}>{Number(drop) > 0 ? '+' : ''}{drop}%</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimeOfOpenHeatmap
// ---------------------------------------------------------------------------

function TimeOfOpenHeatmap({ filters }: { filters: Partial<OpenIntelligenceFilters> }) {
  const { data, isLoading } = useTimeHeatmap(filters)
  const cells = data?.cells ?? []
  const maxCount = data?.max_count ?? 1

  if (isLoading) return null

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  cells.forEach(c => { grid[c.day][c.hour] = c.count })

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold text-sm">
        <Clock size={15} className="text-blue-500" />
        Time-of-Open Heatmap
        <span className="text-xs text-slate-400 font-normal">(lead local time)</span>
      </div>

      {/* Hour labels */}
      <div className="flex gap-0 ml-10 mb-1">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center text-[9px] text-slate-400">
            {h % 3 === 0 ? `${h}h` : ''}
          </div>
        ))}
      </div>

      {/* Grid */}
      {grid.map((row, d) => (
        <div key={d} className="flex items-center gap-0 mb-0.5">
          <span className="w-10 text-[10px] text-slate-400 text-right pr-1.5 shrink-0">{DAY_LABELS[d]}</span>
          {row.map((count, h) => {
            const opacity = maxCount > 0 ? 0.1 + (count / maxCount) * 0.9 : 0.05
            return (
              <div
                key={h}
                title={`${DAY_LABELS[d]} ${h}:00 — ${count} open${count !== 1 ? 's' : ''}`}
                className="flex-1 rounded-sm"
                style={{
                  height: 14,
                  backgroundColor: count > 0 ? `rgba(59,130,246,${opacity.toFixed(2)})` : '#f1f5f9',
                  margin: '0 1px',
                }}
              />
            )
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-slate-400">Low</span>
        {[0.1, 0.3, 0.55, 0.8, 1.0].map(op => (
          <div
            key={op}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `rgba(59,130,246,${op})` }}
          />
        ))}
        <span className="text-[10px] text-slate-400">High</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CountryTimeMatrix — three mini peak-hour summaries
// ---------------------------------------------------------------------------

function CountryPeakCard({ country }: { country: string }) {
  const { data } = usePeakHours(country)
  const peaks = data?.peak_hours ?? []
  const top = peaks[0]

  return (
    <div className="flex-1 border border-slate-200 rounded-xl p-3 text-center">
      <p className="text-xs font-semibold text-slate-600 mb-2">{country}</p>
      {top ? (
        <>
          <p className="text-2xl font-bold text-blue-600">{top.hour}:00</p>
          <p className="text-xs text-slate-400 mt-0.5">peak hour</p>
          <div className="mt-2 flex flex-col gap-1">
            {peaks.slice(0, 3).map(p => (
              <div key={p.hour} className="flex items-center gap-1.5">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-400 h-1.5 rounded-full"
                    style={{ width: `${Math.round((p.count / peaks[0].count) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-8 text-right">{p.hour}h</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400 mt-2">No data</p>
      )}
    </div>
  )
}

function CountryTimeMatrix() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold text-sm">
        <Globe size={15} className="text-green-500" />
        Country × Peak Open Times
      </div>
      <div className="flex gap-3">
        {COUNTRIES.map(c => <CountryPeakCard key={c} country={c} />)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main OpenIntelligenceTab component
// ---------------------------------------------------------------------------

export default function OpenIntelligenceTab() {
  const [filters, setFilters] = useState<Partial<OpenIntelligenceFilters>>({})
  const [drawerRow, setDrawerRow] = useState<SubjectLineRow | null>(null)

  const syncMutation = useSyncOpenEvents()

  // Campaigns list reused from existing overview data
  const { data: overviewData } = useEmailOverview()
  const campaigns = useMemo(
    () => (overviewData?.campaigns ?? []).map((c) => ({
      campaign_id:   c.id,
      campaign_name: c.name ?? c.id,
    })),
    [overviewData],
  )

  // Existing tag for the drawer row
  const { data: tagsData } = useTags(drawerRow?.campaign_id ?? null)
  const existingTag = useMemo(() => {
    if (!drawerRow || !tagsData) return null
    return (
      tagsData.items.find(
        t =>
          t.campaign_id  === drawerRow.campaign_id &&
          t.step_number  === drawerRow.step_number &&
          t.variant_id   === drawerRow.variant_id,
      ) ?? null
    )
  }, [drawerRow, tagsData])

  return (
    <div className="relative">
      {/* Angle tag drawer */}
      {drawerRow && (
        <AngleTagDrawer
          row={drawerRow}
          existingTag={existingTag}
          onClose={() => setDrawerRow(null)}
        />
      )}

      {/* Sync bar + Filters */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400">
          {syncMutation.isSuccess && `Synced ${(syncMutation.data as any)?.data?.rows_inserted ?? 0} open events from Instantly`}
        </p>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={syncMutation.isPending ? 'animate-spin' : ''} />
          {syncMutation.isPending ? 'Syncing opens…' : 'Sync Opens from Instantly'}
        </button>
      </div>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        campaigns={campaigns}
      />

      {/* Auto insights */}
      <InsightsSummaryCard filters={filters} />

      {/* Hot leads alert */}
      <HotLeadsAlert />

      {/* Subject line leaderboard — click row to open angle tag drawer */}
      <SubjectLineLeaderboard
        filters={filters}
        onRowClick={row => setDrawerRow(row)}
      />

      {/* Body angle performance */}
      <BodyAnglePerformance filters={filters} />

      {/* Sequence step funnel */}
      <SequenceStepBreakdown filters={filters} />

      {/* Time heatmap */}
      <TimeOfOpenHeatmap filters={filters} />

      {/* Country peak times */}
      <CountryTimeMatrix />
    </div>
  )
}
