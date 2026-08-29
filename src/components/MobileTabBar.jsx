import { Clapperboard, Home, Image as ImageIcon, Plus, Radio } from 'lucide-react'

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'clips', label: 'Clips', icon: Clapperboard },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'pics', label: 'Pics', icon: ImageIcon },
]

export default function MobileTabBar({ currentView, onNavigate }) {
  const active = currentView === 'shorts' ? 'clips' : currentView
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="grid h-14 grid-cols-5">
        {TABS.map((tab) => {
          const on = active === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                on ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 1.8} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
