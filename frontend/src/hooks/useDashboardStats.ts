import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import type { DashboardStats, ChartDataPoint } from '../types'

export interface DashboardFilters {
  dateRange: string
  country?: string
  companyType?: string
  pipelineStage?: string
}

const defaultFilters: DashboardFilters = {
  dateRange: 'This Month',
}

export function useDashboardStats(filters: DashboardFilters = defaultFilters) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ date_range: filters.dateRange })
      if (filters.country) params.set('country', filters.country)
      if (filters.companyType) params.set('company_type', filters.companyType)
      if (filters.pipelineStage) params.set('pipeline_stage', filters.pipelineStage)
      return (await api.get(`/dashboard/stats?${params}`)).data
    },
  })
}

export function useChartData(days = 30) {
  return useQuery<ChartDataPoint[]>({
    queryKey: ['chart-data', days],
    queryFn: async () => (await api.get(`/dashboard/chart-data?days=${days}`)).data,
  })
}
