export function HeaderDropdown({ children, width = 'w-48' }) {
  return (
    <div
      className={`absolute right-0 mt-2 ${width} overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200`}
    >
      {children}
    </div>
  );
}

export function HeaderDropdownItem({ onClick, icon, children, borderTop = true, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium ${
        borderTop ? 'border-t border-slate-100' : ''
      } ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
    >
      {icon}
      {children}
    </button>
  );
}
