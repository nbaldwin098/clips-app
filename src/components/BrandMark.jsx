export default function BrandMark({ size = 32, withWord = true, wordClassName = 'text-base font-extrabold tracking-tight text-white' }) {
  const px = typeof size === 'number' ? `${size}px` : size
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <img
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className="rounded-lg shrink-0"
        style={{ width: px, height: px }}
      />
      {withWord ? <span className={wordClassName}>Clips</span> : <span className="sr-only">Clips</span>}
    </span>
  )
}
