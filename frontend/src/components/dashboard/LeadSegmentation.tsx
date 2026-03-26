import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { companyTypeSegments, companySizeSegments, leadSourceSegments } from '../../data/mockDashboardData'
import type { SegmentData } from '../../data/mockDashboardData'

function MiniDonut({ data, title }: { data: SegmentData[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <h4 className="text-xs font-medium text-slate-500 mb-2 text-center">{title}</h4>
      <div className="flex items-center gap-2">
        <div className="w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
                      {d.name}: {d.value} ({((d.value / total) * 100).toFixed(0)}%)
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-slate-600 truncate flex-1">{d.name}</span>
              <span className="text-slate-400">{((d.value / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LeadSegmentation() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="text-sm font-medium text-slate-700 mb-4">Lead Segmentation</h3>
      <div className="space-y-5">
        <MiniDonut data={companyTypeSegments} title="By Company Type" />
        <MiniDonut data={companySizeSegments} title="By Company Size" />
        <MiniDonut data={leadSourceSegments} title="By Lead Source" />
      </div>
    </div>
  )
}
