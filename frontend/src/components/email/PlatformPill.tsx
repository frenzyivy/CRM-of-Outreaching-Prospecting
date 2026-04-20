import { PLATFORM_TOKENS } from '@/utils/emailConstants'
import type { EmailPlatform } from '@/types'

interface Props {
  platform: EmailPlatform
  className?: string
}

export default function PlatformPill({ platform, className }: Props) {
  const token = PLATFORM_TOKENS[platform]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className ?? ''}`}
      style={{ backgroundColor: token.bg, color: token.text }}
    >
      {token.label}
    </span>
  )
}
