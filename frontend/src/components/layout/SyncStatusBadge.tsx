import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRealtimeSync } from '../../contexts/RealtimeSyncContext'

function formatRelative(date: Date | null): string {
  if (!date) return 'never'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export default function SyncStatusBadge() {
  const { status, lastSyncedAt, forceSync } = useRealtimeSync()
  const [, tick] = useState(0)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const dotColor =
    status === 'connected'   ? 'bg-emerald-500' :
    status === 'connecting'  ? 'bg-amber-500 animate-pulse' :
                               'bg-rose-500'
  const label =
    status === 'connected'   ? 'Live' :
    status === 'connecting'  ? 'Connecting' :
                               'Offline'

  const handleClick = () => {
    setSpinning(true)
    forceSync()
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <button
      onClick={handleClick}
      title={`Realtime: ${label} · Synced ${formatRelative(lastSyncedAt)} · Click to force sync`}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="hidden md:inline">{label}</span>
      <span className="hidden md:inline text-slate-400 dark:text-slate-500">· {formatRelative(lastSyncedAt)}</span>
      <RefreshCw size={11} className={spinning ? 'animate-spin' : ''} />
    </button>
  )
}
