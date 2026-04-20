import type { EmailAccount, EmailAnalyticsDaily, HealthStatus } from '@/types'

/**
 * Compute a weighted rate across multiple analytics rows.
 * Always use total_sent as the denominator — never average individual rates.
 *
 * @param rows       - Array of analytics rows
 * @param metricKey  - e.g. 'total_opened'
 * @param sentKey    - denominator field, default 'total_sent'
 */
export function weightedRate(
  rows: Partial<EmailAnalyticsDaily>[],
  metricKey: keyof EmailAnalyticsDaily,
  sentKey: keyof EmailAnalyticsDaily = 'total_sent',
): number {
  const totalNum = rows.reduce((acc, r) => acc + ((r[metricKey] as number) ?? 0), 0)
  const totalDen = rows.reduce((acc, r) => acc + ((r[sentKey] as number) ?? 0), 0)
  return totalDen > 0 ? Math.round((totalNum / totalDen) * 10000) / 100 : 0
}

/**
 * Remaining capacity = global_daily_limit - total_sent_today.
 * Returns 0 if somehow negative (over-limit).
 */
export function remainingCapacity(
  account: Pick<EmailAccount, 'global_daily_limit'>,
  totalSentToday: number,
): number {
  return Math.max(0, account.global_daily_limit - totalSentToday)
}

/**
 * Determine inbox health status from limit and sent count.
 *   < 90% used  → 'healthy'
 *   90–99%      → 'near_limit'
 *   100%+       → 'maxed'
 */
export function getHealthStatus(globalLimit: number, totalSent: number): HealthStatus {
  if (globalLimit <= 0) return 'healthy'
  const usage = totalSent / globalLimit
  if (usage >= 1)    return 'maxed'
  if (usage >= 0.9)  return 'near_limit'
  return 'healthy'
}

/**
 * Returns usage percentage (0–100+) for a capacity bar.
 */
export function usagePercent(sent: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((sent / limit) * 100))
}

/**
 * Sum a numeric field across an array of objects.
 */
export function sumField<T>(rows: T[], field: keyof T): number {
  return rows.reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0)
}
