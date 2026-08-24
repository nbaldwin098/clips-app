import { cn } from '../lib/utils'

export default function ChannelAvatar({
  src,
  name = '?',
  size = 36,
  className,
}) {
  const px = typeof size === 'number' ? size : 36
  const letter = String(name || '?').replace(/^@/, '').slice(0, 1).toUpperCase()
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: px, height: px }}>
      <span className="block h-full w-full overflow-hidden rounded-full bg-[#272727] text-white">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[11px] font-bold">{letter}</span>
        )}
      </span>
    </span>
  )
}
