import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import type { NormalizedCompany } from '../types'

export function useCompanies() {
  return useQuery<NormalizedCompany[]>({
    queryKey: ['companies'],
    queryFn: async () => (await api.get('/companies')).data,
  })
}

export function useCompanyDetail(companyId: string | undefined) {
  return useQuery<NormalizedCompany>({
    queryKey: ['company', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })
}
