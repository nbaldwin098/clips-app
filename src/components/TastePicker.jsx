import { useState } from 'react'
import { MEDIA_TOPICS, seedTopicAffinity, skipTopicPicker } from '../lib/tasteOnboarding'
import { cn } from '../lib/utils'

export default function TastePicker({ userId, onDone }) {
  const [picked, setPicked] = useState([])

  const toggle = (topic) => {
    setPicked((cur) => {
      if (cur.includes(topic)) return cur.filter((t) => t !== topic)
      if (cur.length >= 5) return cur
      return [...cur, topic]
    })
  }

  const save = () => {
    seedTopicAffinity(userId, picked)
    onDone?.()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">What do you watch?</h2>
          <p className="text-xs text-zinc-500 mt-1">Pick up to 5 topics so Recommended can start. Skip if you want it empty.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {MEDIA_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                'h-9 px-3 rounded-full text-xs font-medium border',
                picked.includes(t) ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={save} className="flex-1 h-10 rounded-lg bg-white text-black text-sm font-bold">
            {picked.length ? 'Save' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={() => { skipTopicPicker(); onDone?.() }}
            className="h-10 px-4 rounded-lg border border-zinc-700 text-xs text-zinc-400"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
