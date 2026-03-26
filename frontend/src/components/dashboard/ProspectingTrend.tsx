import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { prospectingData } from '../../data/mockDashboardData'

export default function ProspectingTrend() {
  const totalEmails = prospectingData.reduce((s, d) => s + d.emailsSent, 0)
  const totalReplies = prospectingData.reduce((s, d) => s + d.repliesReceived, 0)
  const dailyAvg = Math.round(totalEmails / 30)
  const bestDay = prospectingData.reduce((best, d) => d.emailsSent > best.emailsSent ? d : best)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-blue-400" />
        <h3 className="text-sm font-medium text-slate-700">Prospecting Trend (30 Days)</h3>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={prospectingData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => v.slice(5)}
            interval={4}
          />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
            labelFormatter={(v) => `Date: ${v}`}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey="emailsSent" stroke="#3b82f6" name="Emails" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="callsMade" stroke="#10b981" name="Calls" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="repliesReceived" stroke="#f59e0b" name="Replies" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="emailsMA7" stroke="#3b82f6" name="Emails (7d avg)" dot={false} strokeWidth={1} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3">
        <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-500">Daily Average</p>
          <p className="text-lg font-bold text-slate-800">{dailyAvg}</p>
          <p className="text-[10px] text-slate-400">emails/day</p>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-500">Best Day</p>
          <p className="text-lg font-bold text-slate-800">{bestDay.emailsSent}</p>
          <p className="text-[10px] text-slate-400">{bestDay.date.slice(5)}</p>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-500">Total Replies</p>
          <p className="text-lg font-bold text-emerald-600">{totalReplies}</p>
          <p className="text-[10px] text-slate-400">last 30 days</p>
        </div>
      </div>
    </div>
  )
}
