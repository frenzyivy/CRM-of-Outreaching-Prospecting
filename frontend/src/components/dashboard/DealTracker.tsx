import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DollarSign } from 'lucide-react'
import { dealStageValues, avgDealSize, totalPipelineValue, weightedPipelineValue } from '../../data/mockDashboardData'

function formatCurrency(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v}`
}

const stageColors = ['#6366f1', '#3b82f6', '#f59e0b', '#22c55e']

export default function DealTracker() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-emerald-400" />
        <h3 className="text-sm font-medium text-slate-700">Deal Tracker</h3>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-sm font-bold text-slate-800">{formatCurrency(totalPipelineValue)}</p>
          <p className="text-[10px] text-slate-400">Total Pipeline</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-sm font-bold text-blue-500">{formatCurrency(weightedPipelineValue)}</p>
          <p className="text-[10px] text-slate-400">Weighted</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-sm font-bold text-slate-800">{formatCurrency(avgDealSize)}</p>
          <p className="text-[10px] text-slate-400">Avg Deal</p>
        </div>
      </div>

      {/* Stacked Bar */}
      <p className="text-xs text-slate-500 font-medium mb-2">Pipeline Value by Stage</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={dealStageValues} margin={{ left: 0, right: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-slate-300">Value: {formatCurrency(d.value)} ({d.count} deals)</p>
                  <p className="text-slate-300">Weighted: {formatCurrency(d.weightedValue)} ({d.probability}%)</p>
                </div>
              )
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
            {dealStageValues.map((_, i) => (
              <Cell key={i} fill={stageColors[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
