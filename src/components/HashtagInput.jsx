import { useMemo, useState } from 'react'
import { mergeTags } from '../lib/mediaMeta'
import { cn } from '../lib/utils'

/**
 * Hashtag chips input — type #tags or comma list; clicks remove.
 */
export default function HashtagInput({
  value = '',
  onChange,
  description = '',
  placeholder = '#gaming #funny #tutorial',
  className,
  max = 12,
}) {
  const [draft, setDraft] = useState('')
  const tags = useMemo(() => mergeTags(value, description).slice(0, max), [value, description, max])

  const commit = (raw) => {
    const next = mergeTags([...(Array.isArray(value) ? value : String(value || '').split(/[\s,]+/)), raw], description)
      .slice(0, max)
    onChange?.(next.map((t) => `#${t}`).join(' '))
    setDraft('')
  }

  const remove = (tag) => {
    const next = tags.filter((t) => t !== tag)
    onChange?.(next.map((t) => `#${t}`).join(' '))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.length === 0 ? (
          <span className="text-[11px] text-zinc-600">No hashtags yet</span>
        ) : (
          tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => remove(t)}
              className="h-7 px-2 text-[11px] font-medium border border-zinc-700 text-zinc-200 hover:border-white hover:text-white"
              title="Remove"
            >
              #{t} ×
            </button>
          ))
        )}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault()
            if (draft.trim()) commit(draft)
          }
          if (e.key === 'Backspace' && !draft && tags.length) remove(tags[tags.length - 1])
        }}
        onBlur={() => { if (draft.trim()) commit(draft) }}
        className="w-full h-10 bg-black border border-zinc-800 px-3 text-sm text-white"
        placeholder={placeholder}
        maxLength={80}
      />
      <p className="text-[10px] text-zinc-600">
        Press Enter or Space · up to {max} · also pulled from #tags in description
      </p>
    </div>
  )
}

export function tagsFromHashtagField(value) {
  return mergeTags(value, '')
}
