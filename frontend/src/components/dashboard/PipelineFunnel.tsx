import { funnelData } from '../../data/mockDashboardData'

export default function PipelineFunnel() {
  const maxCount = funnelData[0].count

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="text-sm font-medium text-slate-700 mb-4">Pipeline Funnel</h3>
      <div className="space-y-1.5">
        {funnelData.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8)
          const prevCount = i > 0 ? funnelData[i - 1].count : stage.count
          const dropOff = i > 0 ? (((prevCount - stage.count) / prevCount) * 100).toFixed(0) : null

          return (
            <div key={stage.stage} className="group relative">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20 truncate shrink-0">{stage.label}</span>
                <div className="flex-1 relative">
                  <div
                    className="h-7 rounded-md flex items-center justify-end pr-2 transition-all group-hover:opacity-90"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: stage.color,
                      minWidth: '40px',
                    }}
                  >
                    <span className="text-xs font-semibold text-white">{stage.count}</span>
                  </div>
                </div>
                {dropOff && (
                  <span className="text-[10px] text-red-400 w-12 text-right shrink-0">
                    -{dropOff}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-500">Overall conversion</span>
        <span className="text-emerald-500 font-semibold">
          {((funnelData[funnelData.length - 2].count / funnelData[0].count) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
