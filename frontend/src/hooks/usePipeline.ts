import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { PipelineData } from '../types'

export function usePipeline(leadType?: 'company' | 'contact') {
  return useQuery<PipelineData>({
    queryKey: ['pipeline', leadType],
    queryFn: async () => {
      const params = leadType ? { lead_type: leadType } : {}
      return (await api.get('/pipeline', { params })).data
    },
  })
}

export function useUpdateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadType, leadId, stage }: { leadType: string; leadId: string; stage: string }) => {
      return api.put(`/pipeline/${leadType}/${leadId}/stage`, { stage })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useLogActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { lead_type: string; lead_key: string; activity_type: string; description: string }) => {
      return api.post('/activities', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['lead'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}
