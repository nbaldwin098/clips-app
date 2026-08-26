/** Small calabi coin mark for chat, live, tips, and wallet chips. */
export default function CoinIcon({ className = 'h-3.5 w-3.5', title = 'Coins' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role="img"
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.25" fill="none" stroke="#fde68a" strokeWidth="1.25" opacity="0.9" />
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#78350f"
        fontSize="9"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        C
      </text>
    </svg>
  )
}
