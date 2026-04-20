import { Mail, Eye, MessageSquareReply, MousePointerClick, AlertTriangle, Settings } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import QuotaBars from './QuotaBars'
import ToolCampaignTable from './ToolCampaignTable'
import { useToolCampaigns, useToolDaily } from '../../hooks/useEmail'
import type { ToolQuota, ToolAggregate } from '../../types'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  rate?: string
}

function StatCard({ title, value, icon: Icon, color, rate }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <span className="text-sm text-slate-500">{title}</span>
        </div>
        {rate && (
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {rate}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

interface Props {
  toolId: string
  toolName: string
  quota: ToolQuota
  aggregate: ToolAggregate
}

export default function ToolTab({ toolId, toolName, quota, aggregate }: Props) {
  const navigate = useNavigate()
  const { data: campaignsData, isLoading: cl } = useToolCampaigns(toolId)
  const { data: dailyData, isLoading: dl } = useToolDaily(toolId)

  const campaigns = campaignsData?.campaigns || []
  const daily = dailyData?.daily || []

  return (
    <div>
      {/* Quota bars */}
      <QuotaBars quota={quota} />

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Emails Sent"
          value={aggregate.emails_sent.toLocaleString()}
          icon={Mail}
          color="bg-blue-500"
        />
        <StatCard
          title="Open Rate"
          value={`${aggregate.open_rate}%`}
          icon={Eye}
          color="bg-emerald-500"
          rate="Opens"
        />
        <StatCard
          title="Reply Rate"
          value={`${aggregate.reply_rate}%`}
          icon={MessageSquareReply}
          color="bg-purple-500"
          rate="Replies"
        />
        <StatCard
          title="Click Rate"
          value={`${aggregate.click_rate}%`}
          icon={MousePointerClick}
          color="bg-cyan-500"
          rate="Clicks"
        />
        <StatCard
          title="Bounce Rate"
          value={`${aggregate.bounce_rate}%`}
          icon={AlertTriangle}
          color="bg-red-500"
          rate="Bounces"
        />
      </div>

      {/* Daily chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Daily Activity (30 days) — {toolName}
        </h3>
        {dl ? (
          <div className="h-48 animate-pulse bg-slate-50 rounded-lg" />
        ) : daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={(v) => `Date: ${v}`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[2, 2, 0, 0]} />
              <Bar dataKey="opened" fill="#10b981" name="Opened" radius={[2, 2, 0, 0]} />
              <Bar dataKey="replies" fill="#8b5cf6" name="Replies" radius={[2, 2, 0, 0]} />
              <Bar dataKey="bounced" fill="#ef4444" name="Bounced" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
            <p>No daily breakdown available from {toolName}.</p>
            {!quota.connected && (
              <button
                onClick={() => navigate('/integrations')}
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600"
              >
                <Settings size={12} />
                Connect API key to load live data
              </button>
            )}
          </div>
        )}
      </div>

      {/* Campaign table */}
      {cl ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 h-32 animate-pulse" />
      ) : (
        <ToolCampaignTable campaigns={campaigns} toolName={toolName} />
      )}
    </div>
  )
}
