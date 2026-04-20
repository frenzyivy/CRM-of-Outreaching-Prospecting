import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type SyncStatus = 'connected' | 'connecting' | 'disconnected'

interface RealtimeSyncContextValue {
  status: SyncStatus
  lastSyncedAt: Date | null
  forceSync: () => void
}

const RealtimeSyncContext = createContext<RealtimeSyncContextValue | null>(null)

const TABLES_TO_WATCH: Array<{ table: string; keys: string[] }> = [
  { table: 'leads',                keys: ['leads', 'leads-leads', 'leads-companies', 'company-view', 'people-view', 'pipeline', 'dashboard-stats', 'lead-detail'] },
  { table: 'activities',           keys: ['activities', 'dashboard-stats', 'needs-attention', 'lead-detail'] },
  { table: 'companies',            keys: ['companies', 'company-detail', 'leads-companies'] },
  { table: 'notifications',        keys: ['notifications'] },
  { table: 'email_accounts',       keys: ['email-accounts', 'integrations-status'] },
  { table: 'platform_connections', keys: ['email-accounts', 'integrations-status'] },
  { table: 'revenue_entries',      keys: ['revenue-summary'] },
  { table: 'expenses',             keys: ['revenue-summary', 'expenses'] },
]

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<SyncStatus>('connecting')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const subscribedCountRef = useRef(0)

  const forceSync = useCallback(() => {
    queryClient.invalidateQueries()
    setLastSyncedAt(new Date())
  }, [queryClient])

  useEffect(() => {
    subscribedCountRef.current = 0
    const expectedCount = TABLES_TO_WATCH.length
    setStatus('connecting')

    const channels = TABLES_TO_WATCH.map(({ table, keys }) =>
      supabase
        .channel(`web-sync-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }))
          setLastSyncedAt(new Date())
        })
        .subscribe(state => {
          if (state === 'SUBSCRIBED') {
            subscribedCountRef.current += 1
            if (subscribedCountRef.current >= expectedCount) {
              setStatus('connected')
              setLastSyncedAt(new Date())
            }
          } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
            setStatus('disconnected')
          }
        }),
    )

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [queryClient])

  return (
    <RealtimeSyncContext.Provider value={{ status, lastSyncedAt, forceSync }}>
      {children}
    </RealtimeSyncContext.Provider>
  )
}

export function useRealtimeSync(): RealtimeSyncContextValue {
  const ctx = useContext(RealtimeSyncContext)
  if (!ctx) {
    return { status: 'disconnected', lastSyncedAt: null, forceSync: () => {} }
  }
  return ctx
}
