import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { PipelineData } from '../types'

export function usePipeline() {
  return useQuery<PipelineData>({
    queryKey: ['pipeline'],
    queryFn: async () => (await api.get('/pipeline')).data,
  })
}

export function useUpdateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
      return api.put(`/pipeline/${leadId}/stage`, { stage })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useLogActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { lead_id: string; activity_type: string; description: string }) => {
      return api.post('/activities', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['lead'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}
