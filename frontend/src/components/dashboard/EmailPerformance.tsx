import { Mail } from 'lucide-react'
import { emailFunnel, topTemplates, emailHeatmap } from '../../data/mockDashboardData'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function getHeatColor(value: number): string {
  if (value >= 38) return '#22c55e'
  if (value >= 30) return '#3b82f6'
  if (value >= 22) return '#6366f1'
  if (value >= 16) return '#475569'
  return '#334155'
}

export default function EmailPerformance() {
  // Get unique hours for heatmap
  const hours = [...new Set(emailHeatmap.map((h) => h.hour))].sort((a, b) => a - b)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Mail size={16} className="text-blue-400" />
        <h3 className="text-sm font-medium text-slate-700">Email Performance</h3>
      </div>

      {/* Email Funnel */}
      <div className="space-y-1.5 mb-5">
        {emailFunnel.map((step, i) => {
          const widthPct = Math.max((step.value / emailFunnel[0].value) * 100, 10)
          return (
            <div key={step.label} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 w-16 shrink-0">{step.label}</span>
              <div className="flex-1">
                <div
                  className="h-5 rounded-sm flex items-center px-2"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: i === 0 ? '#3b82f6' : i === emailFunnel.length - 1 ? '#10b981' : '#6366f1',
                    opacity: 1 - i * 0.12,
                  }}
                >
                  <span className="text-[10px] text-white font-medium">{step.value.toLocaleString()}</span>
                </div>
              </div>
              {step.rate && (
                <span className="text-[10px] text-slate-400 w-10 text-right shrink-0">{step.rate}%</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Top Templates */}
      <div className="mb-5">
        <p className="text-xs text-slate-500 font-medium mb-2">Top Performing Templates</p>
        <div className="space-y-2">
          {topTemplates.map((t, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-700 font-medium truncate">{t.subject}</p>
              <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                <span>Open: <span className="text-blue-400 font-medium">{t.openRate}%</span></span>
                <span>Reply: <span className="text-emerald-400 font-medium">{t.replyRate}%</span></span>
                <span>Sent: {t.sent}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">Best Time to Send (Open Rate %)</p>
        <div className="overflow-x-auto">
          <div className="min-w-[280px]">
            <div className="flex gap-0.5">
              <div className="w-8 shrink-0" />
              {hours.filter((_, i) => i % 2 === 0).map((h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-slate-400">
                  {h > 12 ? `${h - 12}p` : `${h}a`}
                </div>
              ))}
            </div>
            {dayLabels.map((day, dayIdx) => (
              <div key={day} className="flex gap-0.5 mt-0.5">
                <span className="w-8 text-[10px] text-slate-400 shrink-0 flex items-center">{day}</span>
                {hours.map((hour) => {
                  const cell = emailHeatmap.find((h) => h.day === dayIdx && h.hour === hour)
                  return (
                    <div
                      key={hour}
                      className="flex-1 h-5 rounded-sm flex items-center justify-center cursor-default"
                      style={{ backgroundColor: getHeatColor(cell?.value ?? 0) }}
                      title={`${day} ${hour}:00 — ${cell?.value ?? 0}%`}
                    >
                      <span className="text-[8px] text-white/70">{cell?.value}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
