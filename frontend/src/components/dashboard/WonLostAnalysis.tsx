import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { wonLostHistory, lostReasons } from '../../data/mockDashboardData'

export default function WonLostAnalysis() {
  const totalWon = wonLostHistory.reduce((s, m) => s + m.won, 0)
  const totalLost = wonLostHistory.reduce((s, m) => s + m.lost, 0)
  const overallWinRate = ((totalWon / (totalWon + totalLost)) * 100).toFixed(1)
  const maxLostReason = lostReasons[0].count

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-emerald-400" />
        <h3 className="text-sm font-medium text-slate-700">Won vs Lost</h3>
        <span className="ml-auto text-xs text-emerald-400 font-medium">{overallWinRate}% win rate</span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={wonLostHistory} margin={{ left: 0, right: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(0, 3) + ' ' + v.slice(-2)} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          <Bar yAxisId="left" dataKey="won" fill="#22c55e" name="Won" radius={[3, 3, 0, 0]} barSize={14} />
          <Bar yAxisId="left" dataKey="lost" fill="#ef4444" name="Lost" radius={[3, 3, 0, 0]} barSize={14} />
          <Line yAxisId="right" type="monotone" dataKey="winRate" stroke="#f59e0b" name="Win Rate %" dot={{ r: 3 }} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Lost Reasons */}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500 font-medium mb-2">Top Reasons for Lost Deals</p>
        <div className="space-y-1.5">
          {lostReasons.map((r) => (
            <div key={r.reason} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 flex-1 truncate">{r.reason}</span>
              <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${(r.count / maxLostReason) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-4 text-right">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
