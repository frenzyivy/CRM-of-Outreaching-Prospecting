import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import type { Company, Contact, LeadRecord, Lead, Activity } from '../types'

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => (await api.get('/leads/companies')).data,
  })
}

export function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => (await api.get('/leads/contacts')).data,
  })
}

export function useLeadsData() {
  return useQuery<LeadRecord[]>({
    queryKey: ['leads'],
    queryFn: async () => (await api.get('/leads/leads')).data,
  })
}

export function useLeadDetail(leadType: string, leadId: string) {
  return useQuery<Lead & { activities: Activity[] }>({
    queryKey: ['lead', leadType, leadId],
    queryFn: async () => (await api.get(`/leads/${leadType}/${leadId}`)).data,
    enabled: !!leadId,
  })
}
