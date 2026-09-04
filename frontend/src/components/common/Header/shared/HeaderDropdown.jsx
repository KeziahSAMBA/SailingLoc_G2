export function HeaderDropdown({ children, width = 'w-48' }) {
  return (
    <div
      className={`absolute right-0 mt-2 ${width} overflow-hidden rounded-lg bg-surface shadow-xl ring-1 ring-border-light`}
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
        borderTop ? 'border-t border-header-dropdown-border' : ''
      } ${danger ? 'text-danger hover:bg-header-dropdown-danger-hover' : 'text-neutral-text hover:bg-page'}`}
    >
      {icon}
      {children}
    </button>
  );
}
