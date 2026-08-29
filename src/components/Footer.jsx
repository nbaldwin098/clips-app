export default function Footer({ onNavigate }) {
  const link = (label, view) => (
    <button
      key={label}
      type="button"
      onClick={() => onNavigate?.(view)}
      className="text-xs text-zinc-500 hover:text-white"
    >
      {label}
    </button>
  )

  return (
    <footer className="border-t border-zinc-800 bg-black">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 md:px-6">
        <span className="text-xs text-zinc-600">© {new Date().getFullYear()} calabi</span>
        {link('About', 'about')}
        {link('Create', 'create')}
        {link('Help', 'help')}
        {link('Support', 'support')}
      </div>
    </footer>
  )
}
