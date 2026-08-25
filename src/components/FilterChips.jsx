import { cn } from '../lib/utils'

export default function FilterChips({ value, onChange, options }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(options || []).map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange?.(o.id)}
          className={cn(
            'h-8 px-3.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            value === o.id ? 'bg-white text-black' : 'bg-[#272727] text-zinc-100 hover:bg-[#3f3f3f]'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
