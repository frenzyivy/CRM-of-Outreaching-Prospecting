import { Mail, Phone, MessageCircle, TrendingUp, Users, Calendar } from 'lucide-react'
import { useEmailOverview } from '../../hooks/useEmail'

const channels = [
  { name: 'Email', icon: Mail, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30', connected: true },
  { name: 'Calls', icon: Phone, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30', connected: false },
  { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-500 bg-green-50 dark:bg-green-900/30', connected: false },
]

export default function OverviewTab() {
  const { data: emailData } = useEmailOverview()
  const overview = emailData?.overview

  return (
    <div className="space-y-6">
      {/* Channel comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((ch) => {
          const isEmail = ch.name === 'Email'
          return (
            <div key={ch.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${ch.color}`}>
                  <ch.icon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ch.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ch.connected ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    {ch.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>

              {ch.connected && isEmail && overview ? (
                <div className="space-y-3">
                  <MetricRow icon={Mail} label="Sent" value={overview.emails_sent.toLocaleString()} />
                  <MetricRow icon={Users} label="Contacted" value={overview.contacted.toLocaleString()} />
                  <MetricRow icon={TrendingUp} label="Open Rate" value={`${overview.open_rate}%`} />
                  <MetricRow icon={TrendingUp} label="Reply Rate" value={`${overview.reply_rate}%`} />
                  <MetricRow icon={Calendar} label="Meetings Booked" value={overview.total_meeting_booked.toLocaleString()} />
                </div>
              ) : !ch.connected ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                  Connect {ch.name} to see performance data
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      {overview && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Cross-Channel Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total Outreach" value={overview.emails_sent.toLocaleString()} sub="Across all channels" />
            <SummaryCard label="Total Responses" value={overview.reply_count.toLocaleString()} sub={`${overview.reply_rate}% response rate`} />
            <SummaryCard label="Meetings Booked" value={overview.total_meeting_booked.toLocaleString()} sub="From all channels" />
            <SummaryCard label="Opportunities" value={overview.total_opportunities.toLocaleString()} sub={`$${overview.total_opportunity_value.toLocaleString()} value`} />
          </div>
        </div>
      )}
    </div>
  )
}

function MetricRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}
