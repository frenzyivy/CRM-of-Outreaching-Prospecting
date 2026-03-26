import { Mail, Eye, Reply, MousePointer, AlertTriangle, TrendingUp } from 'lucide-react'
import { useEmailOverview, useEmailDaily, useEmailCountries } from '../../hooks/useEmail'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function EmailTab() {
  const { data: overviewData, isLoading: loadingOverview } = useEmailOverview()
  const { data: dailyData } = useEmailDaily()
  const { data: countryData } = useEmailCountries()

  const overview = overviewData?.overview

  if (loadingOverview) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="text-center py-16">
        <Mail size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Connect Instantly.ai to see email performance data</p>
      </div>
    )
  }

  const funnel = [
    { label: 'Sent', value: overview.emails_sent, icon: Mail, color: 'bg-blue-500' },
    { label: 'Opened', value: overview.unique_opens, icon: Eye, color: 'bg-indigo-500', rate: `${overview.open_rate}%` },
    { label: 'Clicked', value: overview.unique_clicks, icon: MousePointer, color: 'bg-violet-500', rate: `${overview.click_rate}%` },
    { label: 'Replied', value: overview.unique_replies, icon: Reply, color: 'bg-emerald-500', rate: `${overview.reply_rate}%` },
    { label: 'Bounced', value: overview.bounce_count, icon: AlertTriangle, color: 'bg-red-500', rate: `${overview.bounce_rate}%` },
  ]

  return (
    <div className="space-y-6">
      {/* Email funnel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Email Funnel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {funnel.map((step) => (
            <div key={step.label} className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className={`w-8 h-8 ${step.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <step.icon size={14} className="text-white" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{step.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{step.label}</p>
              {step.rate && <p className="text-xs font-medium text-blue-500 mt-0.5">{step.rate}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Interested" value={overview.total_interested} icon={TrendingUp} color="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" />
        <MetricCard label="Meetings Booked" value={overview.total_meeting_booked} icon={TrendingUp} color="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" />
        <MetricCard label="Won" value={overview.total_closed} icon={TrendingUp} color="text-teal-500 bg-teal-50 dark:bg-teal-900/30" />
        <MetricCard label="Opportunities" value={overview.total_opportunities} icon={TrendingUp} color="text-violet-500 bg-violet-50 dark:bg-violet-900/30" />
      </div>

      {/* Daily chart */}
      {dailyData?.daily && dailyData.daily.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Daily Email Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData.daily.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="opened" fill="#6366f1" radius={[4, 4, 0, 0]} name="Opened" />
                <Bar dataKey="replies" fill="#10b981" radius={[4, 4, 0, 0]} name="Replies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Country breakdown */}
      {countryData?.country_stats && countryData.country_stats.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Performance by Country</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2 text-slate-500 dark:text-slate-400 font-medium">Country</th>
                  <th className="pb-2 text-slate-500 dark:text-slate-400 font-medium text-right">Leads</th>
                  <th className="pb-2 text-slate-500 dark:text-slate-400 font-medium text-right">Open Rate</th>
                  <th className="pb-2 text-slate-500 dark:text-slate-400 font-medium text-right">Reply Rate</th>
                  <th className="pb-2 text-slate-500 dark:text-slate-400 font-medium text-right">Interested</th>
                  <th className="pb-2 text-slate-500 dark:text-slate-400 font-medium text-right">Meetings</th>
                </tr>
              </thead>
              <tbody>
                {countryData.country_stats.slice(0, 15).map((c) => (
                  <tr key={c.country} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2 text-slate-800 dark:text-slate-200 font-medium">{c.country}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{c.total_leads}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{c.open_rate}%</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{c.reply_rate}%</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{c.interested}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{c.meeting_booked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof TrendingUp; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}
