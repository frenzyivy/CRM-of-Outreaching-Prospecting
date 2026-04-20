import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

export interface AssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  history: AssistantChatMessage[]
}

export interface AssistantChatResponse {
  reply: string
  tool_calls_made: string[]
}

export interface AssistantGroup {
  id: string
  name: string
  description: string
  member_count: number
  created_at: string
}

export function useAssistantChat() {
  return useMutation<AssistantChatResponse, Error, ChatRequest>({
    mutationFn: async (data) =>
      (await api.post<AssistantChatResponse>('/assistant/chat', data, { timeout: 60000 })).data,
  })
}

export function useAssistantGroups() {
  return useQuery<AssistantGroup[]>({
    queryKey: ['assistant-groups'],
    queryFn: async () => (await api.get<AssistantGroup[]>('/assistant/groups')).data,
    staleTime: 0,
  })
}

export function useRefreshGroups() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['assistant-groups'] })
}

export function useRenameGroup() {
  const qc = useQueryClient()
  return useMutation<AssistantGroup, Error, { id: string; name: string }>({
    mutationFn: async ({ id, name }) =>
      (await api.patch<AssistantGroup>(`/assistant/groups/${id}`, { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assistant-groups'] }),
  })
}

export interface GroupMember {
  email: string
  name: string
  company: string
  country: string
  specialty: string
  stage: string
}

export function useGroupMembers(groupId: string | null) {
  return useQuery<GroupMember[]>({
    queryKey: ['group-members', groupId],
    queryFn: async () => (await api.get<GroupMember[]>(`/assistant/groups/${groupId}/members`)).data,
    enabled: !!groupId,
    staleTime: 0,
  })
}
