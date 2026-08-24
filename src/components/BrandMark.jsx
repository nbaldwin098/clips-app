export default function BrandMark({ size = 32 }) {
  const px = typeof size === 'number' ? `${size}px` : size
  return (
    <img
      src="/logo.png"
      alt="calabi"
      width={size}
      height={size}
      className="rounded-lg shrink-0"
      style={{ width: px, height: px }}
    />
  )
}
