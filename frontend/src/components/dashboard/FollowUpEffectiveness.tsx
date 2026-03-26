import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { Repeat } from 'lucide-react'
import { followUpData, followUpTimingData, optimalFollowUps } from '../../data/mockDashboardData'

export default function FollowUpEffectiveness() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Repeat size={16} className="text-purple-400" />
        <h3 className="text-sm font-medium text-slate-700">Follow-up Effectiveness</h3>
      </div>

      {/* Response Rate by Follow-up Number */}
      <p className="text-xs text-slate-500 font-medium mb-2">Response Rate by Follow-up #</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={followUpData} margin={{ left: 0, right: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={(v) => v.replace('Follow-up', 'F/U')} />
          <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-slate-300">Rate: {d.responseRate}% ({d.replies}/{d.totalSent})</p>
                </div>
              )
            }}
          />
          <Bar dataKey="responseRate" radius={[4, 4, 0, 0]} barSize={28}>
            {followUpData.map((d, i) => (
              <Cell
                key={i}
                fill={d.followUpNumber <= optimalFollowUps ? '#10b981' : d.followUpNumber <= 3 ? '#f59e0b' : '#64748b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="my-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 flex items-center gap-2">
        <span className="text-xs text-emerald-400 font-medium">Sweet spot:</span>
        <span className="text-xs text-slate-500">{optimalFollowUps} follow-ups for best ROI</span>
      </div>

      {/* Timing Chart */}
      <p className="text-xs text-slate-500 font-medium mb-2">Days Between Follow-ups vs Response Rate</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={followUpTimingData} margin={{ left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
          <XAxis dataKey="delayDays" tick={{ fontSize: 10 }} unit="d" />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
            formatter={(v) => [`${v}%`, 'Response Rate']}
            labelFormatter={(v) => `${v} day delay`}
          />
          <Line type="monotone" dataKey="responseRate" stroke="#8b5cf6" dot={{ r: 3, fill: '#8b5cf6' }} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 text-[10px] text-slate-400 text-center">
        Optimal delay: <span className="text-purple-400 font-medium">3 days</span> between follow-ups
      </div>
    </div>
  )
}
