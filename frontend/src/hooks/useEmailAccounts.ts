import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import type {
  EmailAccount,
  EmailOverview,
  EmailPlatform,
  EmailPlatformMetrics,
  SyncStatus,
  PlatformConnection,
} from '@/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
const KEYS = {
  accounts:         ['email', 'accounts'] as const,
  account:          (id: string) => ['email', 'accounts', id] as const,
  overview:         ['email', 'analytics', 'overview'] as const,
  platform:         (pk: EmailPlatform) => ['email', 'analytics', 'platform', pk] as const,
  syncStatus:       ['email', 'sync', 'status'] as const,
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function useEmailAccounts() {
  return useQuery<EmailAccount[]>({
    queryKey: KEYS.accounts,
    queryFn: async () => {
      const res = await api.get<{ accounts: EmailAccount[] }>('/email/accounts')
      return res.data.accounts
    },
    staleTime: 60_000,   // treat as fresh for 1 minute
  })
}

export function useEmailAccountDetail(accountId: string | undefined) {
  return useQuery<EmailAccount>({
    queryKey: KEYS.account(accountId ?? ''),
    queryFn: async () => (await api.get<EmailAccount>(`/email/accounts/${accountId}`)).data,
    enabled: !!accountId,
  })
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function useEmailAnalyticsOverview() {
  return useQuery<EmailOverview>({
    queryKey: KEYS.overview,
    queryFn: async () => (await api.get<EmailOverview>('/email/analytics/overview')).data,
    staleTime: 60_000,
  })
}

export function useEmailPlatformMetrics(platform: EmailPlatform | undefined) {
  return useQuery<EmailPlatformMetrics>({
    queryKey: KEYS.platform(platform ?? 'instantly'),
    queryFn: async () =>
      (await api.get<EmailPlatformMetrics>(`/email/analytics/platform/${platform}`)).data,
    enabled: !!platform,
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export function useSyncStatus() {
  return useQuery<SyncStatus>({
    queryKey: KEYS.syncStatus,
    queryFn: async () => (await api.get<SyncStatus>('/email/sync/status')).data,
    refetchInterval: 60_000,
  })
}

export function useTriggerSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => api.post('/email/sync/trigger'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['email'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Account mutations
// ---------------------------------------------------------------------------

export function useCreateEmailAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { email: string; global_daily_limit?: number; warmup_score?: number }) =>
      (await api.post<EmailAccount>('/email/accounts', data)).data,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts })
    },
  })
}

export function useUpdateEmailAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; global_daily_limit?: number; warmup_score?: number }) =>
      (await api.put<EmailAccount>(`/email/accounts/${id}`, data)).data,
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts })
      queryClient.invalidateQueries({ queryKey: KEYS.account(vars.id) })
    },
  })
}

export function useDeleteEmailAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (accountId: string) => api.delete(`/email/accounts/${accountId}`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts })
    },
  })
}

// ---------------------------------------------------------------------------
// Connection mutations
// ---------------------------------------------------------------------------

export function useAddPlatformConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      accountId,
      ...data
    }: {
      accountId: string
      platform: EmailPlatform
      allocated_daily_limit: number
      platform_account_id?: string
      is_active?: boolean
    }) => (await api.post<PlatformConnection>(`/email/accounts/${accountId}/connections`, data)).data,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts })
    },
  })
}

export function useUpdatePlatformConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      connId,
      ...data
    }: { connId: string; allocated_daily_limit?: number; is_active?: boolean }) =>
      (await api.put<PlatformConnection>(`/email/connections/${connId}`, data)).data,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts })
    },
  })
}

export function useDeletePlatformConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (connId: string) => api.delete(`/email/connections/${connId}`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts })
    },
  })
}
