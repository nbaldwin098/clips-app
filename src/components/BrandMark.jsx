import { cn } from '../lib/utils'

export default function BrandMark({ size = 32, withWord = false, className }) {
  const px = typeof size === 'number' ? `${size}px` : size
  return (
    <span className={cn('inline-flex items-center gap-2 min-w-0', className)}>
      <img
        src="/logo.png"
        alt={withWord ? '' : 'calabi'}
        width={size}
        height={size}
        className="rounded-lg shrink-0"
        style={{ width: px, height: px }}
      />
      {withWord ? (
        <span className="wordmark hidden sm:inline truncate text-[20px] font-extrabold tracking-tight text-white leading-none">
          calabi
        </span>
      ) : null}
    </span>
  )
}
