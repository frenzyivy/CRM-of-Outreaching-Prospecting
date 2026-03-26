import { Target } from 'lucide-react'
import { monthlyForecast, quarterlyForecast, monthlyTarget, quarterlyTarget } from '../../data/mockDashboardData'
import type { ForecastScenario } from '../../data/mockDashboardData'

function formatCurrency(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v}`
}

function ScenarioBar({ scenarios, target, label }: { scenarios: ForecastScenario[]; target: number; label: string }) {
  const max = Math.max(...scenarios.map((s) => s.value), target)

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-[10px] text-slate-400">Target: {formatCurrency(target)}</p>
      </div>
      <div className="space-y-2">
        {scenarios.map((s) => {
          const pct = (s.value / max) * 100
          const isAboveTarget = s.value >= target
          return (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[11px] w-20 shrink-0" style={{ color: s.color }}>{s.label}</span>
              <div className="flex-1 relative h-6 bg-slate-100 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center px-2 transition-all"
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                >
                  <span className="text-[10px] text-white font-medium">{formatCurrency(s.value)}</span>
                </div>
                {/* Target line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/60"
                  style={{ left: `${(target / max) * 100}%` }}
                />
              </div>
              {isAboveTarget ? (
                <span className="text-[10px] text-emerald-400 w-8">+{(((s.value - target) / target) * 100).toFixed(0)}%</span>
              ) : (
                <span className="text-[10px] text-red-400 w-8">-{(((target - s.value) / target) * 100).toFixed(0)}%</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RevenueForecast() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target size={16} className="text-blue-400" />
        <h3 className="text-sm font-medium text-slate-700">Revenue Forecast</h3>
      </div>

      <ScenarioBar scenarios={monthlyForecast} target={monthlyTarget} label="This Month" />
      <ScenarioBar scenarios={quarterlyForecast} target={quarterlyTarget} label="This Quarter" />

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5 text-xs text-slate-500">
        Based on current pipeline ({formatCurrency(2450000)}) and historical conversion rates.
        Realistic scenario assumes {((890000 / 2450000) * 100).toFixed(0)}% weighted conversion.
      </div>
    </div>
  )
}
