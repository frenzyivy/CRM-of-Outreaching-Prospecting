import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../api/client'
import type {
  AgentStatus,
  LeadContext,
  DraftEmailRequest,
  FollowUpRequest,
  LinkedInPostRequest,
  CopywritingRequest,
  FreeformRequest,
  AgentEmailResult,
  AgentContentResult,
} from '../types'

export function useAgentStatus() {
  return useQuery<AgentStatus>({
    queryKey: ['agent-status'],
    queryFn: async () => (await api.get('/agent/status')).data,
  })
}

export function useLeadContext(leadId: string) {
  return useQuery<LeadContext>({
    queryKey: ['lead-context', leadId],
    queryFn: async () => (await api.get(`/agent/lead/${leadId}/context`)).data,
    enabled: !!leadId,
  })
}

export function useDraftEmail() {
  return useMutation<AgentEmailResult, Error, DraftEmailRequest>({
    mutationFn: async (data) => (await api.post('/agent/draft-email', data)).data,
  })
}

export function useDraftFollowUp() {
  return useMutation<AgentEmailResult, Error, FollowUpRequest>({
    mutationFn: async (data) => (await api.post('/agent/draft-follow-up', data)).data,
  })
}

export function useLinkedInPost() {
  return useMutation<AgentContentResult, Error, LinkedInPostRequest>({
    mutationFn: async (data) => (await api.post('/agent/linkedin-post', data)).data,
  })
}

export function useCopywriting() {
  return useMutation<AgentContentResult, Error, CopywritingRequest>({
    mutationFn: async (data) => (await api.post('/agent/copywriting', data)).data,
  })
}

export function useFreeform() {
  return useMutation<AgentContentResult, Error, FreeformRequest>({
    mutationFn: async (data) => (await api.post('/agent/freeform', data)).data,
  })
}
