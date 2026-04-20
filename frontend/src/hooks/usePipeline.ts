import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Lead, PipelineData } from '../types'

export function usePipeline() {
  return useQuery<PipelineData>({
    queryKey: ['pipeline'],
    queryFn: async () => (await api.get('/pipeline')).data,
  })
}

function moveLead(data: PipelineData, leadId: string, newStage: string): PipelineData {
  let movedLead: Lead | undefined
  const stages: Record<string, Lead[]> = {}
  for (const stage of data.stage_order) {
    stages[stage] = (data.stages[stage] ?? []).filter((l) => {
      if (l.id === leadId) { movedLead = l; return false }
      return true
    })
  }
  if (movedLead) {
    stages[newStage] = [{ ...movedLead, stage: newStage }, ...(stages[newStage] ?? [])]
  }
  const stage_counts: Record<string, number> = {}
  for (const stage of data.stage_order) {
    stage_counts[stage] = stages[stage]?.length ?? 0
  }
  return { ...data, stages, stage_counts }
}

export function useUpdateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
      return api.put(`/pipeline/${leadId}/stage`, { stage })
    },
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] })
      const prev = queryClient.getQueryData<PipelineData>(['pipeline'])
      if (prev) {
        queryClient.setQueryData(['pipeline'], moveLead(prev, leadId, stage))
      }
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['pipeline'], context.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
