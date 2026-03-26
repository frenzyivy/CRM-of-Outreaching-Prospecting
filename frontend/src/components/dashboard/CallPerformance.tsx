import { Phone } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { callMetrics, callOutcomes, callHeatmap } from '../../data/mockDashboardData'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function getHeatColor(value: number): string {
  if (value >= 32) return '#22c55e'
  if (value >= 26) return '#3b82f6'
  if (value >= 18) return '#6366f1'
  if (value >= 12) return '#475569'
  return '#334155'
}

export default function CallPerformance() {
  const hours = [...new Set(callHeatmap.map((h) => h.hour))].sort((a, b) => a - b)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Phone size={16} className="text-emerald-400" />
        <h3 className="text-sm font-medium text-slate-700">Call Performance</h3>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-slate-800">{callMetrics.totalCalls}</p>
          <p className="text-[10px] text-slate-400">Total Calls</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-500">{callMetrics.connectRate}%</p>
          <p className="text-[10px] text-slate-400">Connect Rate</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-slate-800">{callMetrics.avgDuration}</p>
          <p className="text-[10px] text-slate-400">Avg Duration</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-blue-500">{callMetrics.meetingsFromCalls}</p>
          <p className="text-[10px] text-slate-400">Meetings Booked</p>
        </div>
      </div>

      {/* Outcome Distribution */}
      <p className="text-xs text-slate-500 font-medium mb-2">Outcome Distribution</p>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={callOutcomes}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {callOutcomes.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
                      {d.label}: {d.value} ({((d.value / callMetrics.totalCalls) * 100).toFixed(0)}%)
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {callOutcomes.map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-slate-600 flex-1">{d.label}</span>
              <span className="text-slate-800 font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <p className="text-xs text-slate-500 font-medium mb-2">Best Time to Call (Connect Rate %)</p>
      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="flex gap-0.5">
            <div className="w-8 shrink-0" />
            {hours.filter((_, i) => i % 2 === 0).map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-slate-400">
                {h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            ))}
          </div>
          {dayLabels.map((day, dayIdx) => (
            <div key={day} className="flex gap-0.5 mt-0.5">
              <span className="w-8 text-[10px] text-slate-400 shrink-0 flex items-center">{day}</span>
              {hours.map((hour) => {
                const cell = callHeatmap.find((h) => h.day === dayIdx && h.hour === hour)
                return (
                  <div
                    key={hour}
                    className="flex-1 h-5 rounded-sm flex items-center justify-center cursor-default"
                    style={{ backgroundColor: getHeatColor(cell?.value ?? 0) }}
                    title={`${day} ${hour}:00 — ${cell?.value ?? 0}%`}
                  >
                    <span className="text-[8px] text-white/70">{cell?.value}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
