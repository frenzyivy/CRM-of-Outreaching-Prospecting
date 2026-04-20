import type { ToolCampaign } from '../../types'

interface Props {
  campaigns: ToolCampaign[]
  toolName: string
}

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Draft: 'bg-slate-100 text-slate-600',
  Sent: 'bg-blue-100 text-blue-700',
}

export default function ToolCampaignTable({ campaigns, toolName }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">{toolName} Campaigns / Sequences</h3>
        <span className="text-xs text-slate-400">{campaigns.length} campaigns</span>
      </div>

      {campaigns.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          No campaigns found. Connect your API key to load live data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">Campaign</th>
                <th className="text-center px-3 py-3 font-medium">Status</th>
                <th className="text-right px-3 py-3 font-medium">Sent</th>
                <th className="text-right px-3 py-3 font-medium">Open %</th>
                <th className="text-right px-3 py-3 font-medium">Reply %</th>
                <th className="text-right px-3 py-3 font-medium">Click %</th>
                <th className="text-right px-5 py-3 font-medium">Bounce %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => {
                const statusClass = statusColors[c.status] || 'bg-slate-100 text-slate-500'
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-[220px] truncate">
                      {c.name}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">{c.sent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-emerald-600 font-medium">{c.open_rate}%</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-blue-600 font-medium">{c.reply_rate}%</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-purple-600 font-medium">{c.click_rate}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={c.bounce_rate > 5 ? 'text-red-600 font-medium' : 'text-slate-500'}>
                        {c.bounce_rate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
