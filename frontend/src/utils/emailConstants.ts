import type { EmailPlatform } from '@/types'

// ---------------------------------------------------------------------------
// Platform design tokens
// ---------------------------------------------------------------------------

export interface PlatformToken {
  label: string
  color: string   // primary brand color (hex)
  bg: string      // light background tint
  text: string    // dark text on bg
}

export const PLATFORM_TOKENS: Record<EmailPlatform, PlatformToken> = {
  instantly:  { label: 'Instantly.ai', color: '#D85A30', bg: '#FAECE7', text: '#712B13' },
  convertkit: { label: 'ConvertKit',   color: '#BA7517', bg: '#FAEEDA', text: '#412402' },
  lemlist:    { label: 'Lemlist',      color: '#0F6E56', bg: '#E1F5EE', text: '#04342C' },
  smartlead:  { label: 'Smartlead',   color: '#534AB7', bg: '#EEEDFE', text: '#26215C' },
}

export const PLATFORM_ORDER: EmailPlatform[] = ['instantly', 'convertkit', 'lemlist', 'smartlead']

// ---------------------------------------------------------------------------
// Engagement benchmarks
// ---------------------------------------------------------------------------

export type BenchmarkRating = 'good' | 'avg' | 'poor'

export interface MetricBenchmark {
  label: string
  unit: string
  higherIsBetter: boolean   // false for bounce + unsub
  good: number              // threshold for 'good'
  avg: number               // threshold for 'avg' (else 'poor')
}

export const BENCHMARKS: Record<string, MetricBenchmark> = {
  open_rate:   { label: 'Open Rate',        unit: '%', higherIsBetter: true,  good: 15,  avg: 10  },
  click_rate:  { label: 'Click Rate',       unit: '%', higherIsBetter: true,  good: 2.5, avg: 1   },
  reply_rate:  { label: 'Reply Rate',       unit: '%', higherIsBetter: true,  good: 2,   avg: 1   },
  bounce_rate: { label: 'Bounce Rate',      unit: '%', higherIsBetter: false, good: 2,   avg: 5   },
  unsub_rate:  { label: 'Unsubscribe Rate', unit: '%', higherIsBetter: false, good: 0.5, avg: 1   },
}

/**
 * Returns the benchmark rating for a given rate value.
 * For higherIsBetter: value >= good → 'good', >= avg → 'avg', else 'poor'
 * For lowerIsBetter:  value <= good → 'good', <= avg → 'avg', else 'poor'
 */
export function getRating(metricKey: string, value: number): BenchmarkRating {
  const b = BENCHMARKS[metricKey]
  if (!b) return 'avg'
  if (b.higherIsBetter) {
    if (value >= b.good) return 'good'
    if (value >= b.avg)  return 'avg'
    return 'poor'
  } else {
    if (value <= b.good) return 'good'
    if (value <= b.avg)  return 'avg'
    return 'poor'
  }
}

export const RATING_COLORS: Record<BenchmarkRating, string> = {
  good: 'text-emerald-400',
  avg:  'text-yellow-400',
  poor: 'text-red-400',
}

export const HEALTH_COLORS: Record<string, string> = {
  healthy:    'bg-emerald-500/20 text-emerald-400',
  near_limit: 'bg-yellow-500/20 text-yellow-400',
  maxed:      'bg-red-500/20 text-red-400',
}

export const HEALTH_LABELS: Record<string, string> = {
  healthy:    'Healthy',
  near_limit: 'Near Limit',
  maxed:      'Maxed',
}
