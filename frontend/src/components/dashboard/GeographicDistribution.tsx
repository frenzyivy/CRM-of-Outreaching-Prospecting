import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Globe } from 'lucide-react'
import { geographicData } from '../../data/mockDashboardData'

const barColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

export default function GeographicDistribution() {
  const totalLeads = geographicData.reduce((s, d) => s + d.leads, 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={16} className="text-blue-400" />
        <h3 className="text-sm font-medium text-slate-700">Geographic Distribution</h3>
        <span className="ml-auto text-xs text-slate-400">{totalLeads} leads</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={geographicData} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="code"
            tick={{ fontSize: 11 }}
            width={32}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                  <p className="font-medium">{d.country}</p>
                  <p className="text-slate-300">Leads: {d.leads} · Companies: {d.companies}</p>
                  <p className="text-slate-300">Response Rate: {d.responseRate}%</p>
                </div>
              )
            }}
          />
          <Bar dataKey="leads" radius={[0, 4, 4, 0]} barSize={18}>
            {geographicData.map((_, i) => (
              <Cell key={i} fill={barColors[i % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-1.5">
        {geographicData.slice(0, 5).map((d, i) => (
          <div key={d.code} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColors[i] }} />
              <span className="text-slate-600">{d.country}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-800 font-medium">{d.leads}</span>
              <span className="text-slate-400 w-12 text-right">{((d.leads / totalLeads) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
