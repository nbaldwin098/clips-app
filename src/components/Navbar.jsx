import { Search, Bell, Upload, Settings, LogIn, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

export default function Navbar({
  onNavigate,
  currentView,
  onOpenImport,
  onOpenCostSim,
  onOpenAuth,
  onOpenUpload,
}) {
  const { user, isAuthenticated, mode, switchMode } = useAuth()

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-4 px-4">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C729B] text-white font-bold text-sm tracking-tight">
            C
          </div>
          <span className="hidden sm:block text-lg font-semibold tracking-tight text-slate-900">
            Clips
          </span>
        </button>

        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search videos, creators, tags"
              onFocus={() => onNavigate('explore')}
              className="w-full h-9 rounded-full border border-slate-200/80 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onOpenUpload}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Upload"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden md:inline">Upload</span>
          </button>
          <button
            onClick={onOpenImport}
            className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Import
          </button>
          <button
            onClick={onOpenCostSim}
            className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Costs
          </button>

          {isAuthenticated ? (
            <>
              <button
                onClick={() => {
                  if (mode !== 'creator') switchMode('creator')
                  onNavigate('dashboard')
                }}
                className={cn(
                  'h-9 px-3 rounded-full text-sm font-medium transition-colors',
                  mode === 'creator' ? 'bg-[#2C729B] text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                Studio
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-100"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-slate-600" />
              </button>
              <button className="relative h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-100">
                <Bell className="h-5 w-5 text-slate-600" />
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="h-8 w-8 rounded-full bg-[#EBF4FA] flex items-center justify-center text-xs font-semibold text-[#2C729B]"
              >
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82] transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
