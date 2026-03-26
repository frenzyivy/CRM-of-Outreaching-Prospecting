import { ArrowRight } from 'lucide-react'
import { stageMovements } from '../../data/mockDashboardData'

export default function StageMovement() {
  const totalMoved = stageMovements.reduce((s, m) => s + m.count, 0)
  const positiveMoves = stageMovements.filter((m) => m.direction === 'positive')
  const negativeMoves = stageMovements.filter((m) => m.direction === 'negative')

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">Stage Movement Today</h3>
        <span className="text-xs text-slate-400">{totalMoved} moves</span>
      </div>

      <div className="space-y-1.5 mb-4">
        {positiveMoves.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
          >
            <span className="text-xs font-medium text-emerald-500 w-5 text-center">{m.count}</span>
            <span className="text-xs text-slate-500 truncate">{m.fromLabel}</span>
            <ArrowRight size={12} className="text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-700 font-medium truncate">{m.toLabel}</span>
          </div>
        ))}
      </div>

      {negativeMoves.length > 0 && (
        <>
          <div className="border-t border-slate-200 pt-3 mb-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Lost / Stalled</p>
          </div>
          <div className="space-y-1.5">
            {negativeMoves.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10"
              >
                <span className="text-xs font-medium text-red-400 w-5 text-center">{m.count}</span>
                <span className="text-xs text-slate-500 truncate">{m.fromLabel}</span>
                <ArrowRight size={12} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-500 font-medium truncate">{m.toLabel}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-center">
        <div className="bg-emerald-500/5 rounded-lg p-2">
          <p className="text-lg font-bold text-emerald-500">
            {positiveMoves.reduce((s, m) => s + m.count, 0)}
          </p>
          <p className="text-[10px] text-slate-400">Forward moves</p>
        </div>
        <div className="bg-red-500/5 rounded-lg p-2">
          <p className="text-lg font-bold text-red-400">
            {negativeMoves.reduce((s, m) => s + m.count, 0)}
          </p>
          <p className="text-[10px] text-slate-400">Lost / stalled</p>
        </div>
      </div>
    </div>
  )
}
