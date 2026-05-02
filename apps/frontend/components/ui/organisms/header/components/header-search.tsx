'use client'

export function HeaderSearch() {
  return (
    <div
      data-testid="header-search"
      className="flex items-center gap-2 bg-surface border border-line rounded-md px-[10px] py-2 w-[340px] text-text-dim"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        type="search"
        placeholder="Buscar..."
        aria-label="Buscar"
        data-testid="header-search-input"
        className="flex-1 bg-transparent border-0 outline-none text-sm text-text placeholder:text-text-mute"
      />

      <kbd
        className="px-[5px] py-[1.5px] bg-surface-2 rounded text-text-dim"
        style={{ fontSize: '11px', borderRadius: '4px' }}
      >
        ⌘K
      </kbd>
    </div>
  )
}
