import { Check } from 'lucide-react'
import { cn } from '../lib/utils'

export default function VerifiedBadge({ className, title = 'Official channel' }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-black shrink-0',
        className
      )}
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  )
}
