import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import type { Lead, Activity } from '../types'

export function useAllLeads() {
  return useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: async () => (await api.get('/leads')).data,
  })
}

export function useCompanyView() {
  return useQuery<Lead[]>({
    queryKey: ['leads', 'company-view'],
    queryFn: async () => (await api.get('/leads/company-view')).data,
  })
}

export function usePeopleView() {
  return useQuery<Lead[]>({
    queryKey: ['leads', 'people-view'],
    queryFn: async () => (await api.get('/leads/people-view')).data,
  })
}

export function useLeadDetail(leadId: string) {
  return useQuery<Lead & { activities: Activity[] }>({
    queryKey: ['lead', leadId],
    queryFn: async () => (await api.get(`/leads/${leadId}`)).data,
    enabled: !!leadId,
  })
}

export function useCompanyEmployees(companyName: string | undefined) {
  return useQuery<Lead[]>({
    queryKey: ['leads', 'company-employees', companyName],
    queryFn: async () => (await api.get(`/leads/company/${encodeURIComponent(companyName!)}/employees`)).data,
    enabled: !!companyName,
  })
}
