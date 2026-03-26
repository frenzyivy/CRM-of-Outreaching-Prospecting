import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useChartData } from '../../hooks/useDashboardStats'

export default function ActivityChart() {
  const { data, isLoading } = useChartData(30)

  if (isLoading) {
    return <div className="bg-white rounded-2xl border border-slate-100 p-5 h-80 animate-pulse" />
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 h-80 flex items-center justify-center text-slate-400">
        No activity data yet. Start logging emails and calls to see trends.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="text-sm font-medium text-slate-700 mb-4">Activity (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="emails" fill="#3b82f6" name="Emails" radius={[2, 2, 0, 0]} />
          <Bar dataKey="calls" fill="#10b981" name="Calls" radius={[2, 2, 0, 0]} />
          <Bar dataKey="notes" fill="#f59e0b" name="Notes" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
