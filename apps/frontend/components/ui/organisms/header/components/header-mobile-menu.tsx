'use client'

export interface IHeaderMobileMenuProps {
  isOpen: boolean
  onToggle: () => void
}

export function HeaderMobileMenu({ isOpen, onToggle }: IHeaderMobileMenuProps) {
  return (
    <button
      type="button"
      data-testid="header-mobile-menu"
      aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={isOpen}
      onClick={onToggle}
      className="md:hidden w-9 h-9 grid place-items-center rounded-lg text-text-dim hover:bg-surface hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {isOpen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  )
}
