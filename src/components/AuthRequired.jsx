import { LogIn } from 'lucide-react'

export default function AuthRequired({ title = 'Sign in required', description, onOpenAuth }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 min-h-[40vh]">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          {description ||
            'Create an account or sign in to continue. You can still watch and browse without logging in.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </button>
      </div>
    </div>
  )
}
