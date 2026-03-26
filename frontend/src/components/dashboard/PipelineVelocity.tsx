import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Clock } from 'lucide-react'
import { velocityData, avgSalesCycleLength } from '../../data/mockDashboardData'

export default function PipelineVelocity() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={16} className="text-blue-400" />
        <h3 className="text-sm font-medium text-slate-700">Pipeline Velocity</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">Average days in each stage</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={velocityData} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="d" />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10 }}
            width={70}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload
              const isBottleneck = d.avgDays > d.benchmark * 1.3
              return (
                <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-slate-300">Avg: {d.avgDays} days (benchmark: {d.benchmark}d)</p>
                  {isBottleneck && <p className="text-red-400 mt-1">Bottleneck detected</p>}
                </div>
              )
            }}
          />
          <Bar dataKey="avgDays" radius={[0, 4, 4, 0]} barSize={16}>
            {velocityData.map((d, i) => (
              <Cell
                key={i}
                fill={d.avgDays > d.benchmark * 1.3 ? '#ef4444' : d.avgDays > d.benchmark ? '#f59e0b' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 bg-slate-50 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Avg Sales Cycle</p>
          <p className="text-xl font-bold text-slate-800">{avgSalesCycleLength} days</p>
        </div>
        <div className="flex gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">On track</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-500">Slow</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-500">Bottleneck</span>
          </div>
        </div>
      </div>
    </div>
  )
}
