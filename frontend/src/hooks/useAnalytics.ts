import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AnalyticsSummary } from '../types'

export function useAnalytics() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_analytics_summary')
      if (error) throw error
      // Supabase JS client may return the JSON as a string, an object, or
      // wrapped in { get_analytics_summary: {...} } depending on client version
      let parsed = typeof data === 'string' ? JSON.parse(data) : data
      if (parsed && typeof parsed === 'object' && 'get_analytics_summary' in parsed) {
        parsed = parsed.get_analytics_summary
      }
      return parsed as AnalyticsSummary
    },
    staleTime: 0, // always fresh — ensures stale cache doesn't serve zeros
  })
}
