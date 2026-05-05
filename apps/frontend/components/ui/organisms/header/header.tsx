'use client'

import { useState } from 'react'
import { useHeaderUser } from './hooks/use-header-user.hook'
import { useLogout } from './hooks/use-logout.hook'
import { HeaderLogo } from './components/header-logo'
import { HeaderSearch } from './components/header-search'
import { HeaderUserMenu } from './components/header-user-menu'
import { HeaderMobileMenu } from './components/header-mobile-menu'
import { ThemeToggle } from '@/components/ui/molecules/theme-toggle/theme-toggle'
import type { IHeaderProps } from './types/header.types'

export function Header({ variant = 'default', onLogoClick }: IHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated } = useHeaderUser()
  const { logout, isPending, error: logoutError } = useLogout()

  return (
    <header
      data-testid="header"
      className="flex items-center justify-between border-b border-line bg-bg transition-all"
      style={{ padding: variant === 'default' ? '18px 48px' : '12px 24px' }}
    >
      <div className="flex items-center gap-3">
        <HeaderMobileMenu
          isOpen={isMobileMenuOpen}
          onToggle={() => setIsMobileMenuOpen((prev) => !prev)}
        />
        <HeaderLogo onClick={onLogoClick} />
      </div>

      <div className="flex items-center gap-[10px]" data-testid="header-actions">
        <div className="hidden md:block">
          <HeaderSearch />
        </div>

        <button
          type="button"
          data-testid="header-notifications"
          aria-label="Notificações"
          className="relative w-9 h-9 grid place-items-center rounded-lg text-text-dim hover:bg-surface hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span
            aria-hidden="true"
            className="absolute top-[9px] right-[9px] w-1.5 h-1.5 rounded-full bg-warm"
            data-testid="header-notifications-badge"
          />
        </button>

        <ThemeToggle />

        <button
          type="button"
          data-testid="header-settings"
          aria-label="Configurações"
          className="w-9 h-9 grid place-items-center rounded-lg text-text-dim hover:bg-surface hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {isAuthenticated && user && (
          <HeaderUserMenu
            user={user}
            onLogout={logout}
            isLoggingOut={isPending}
            logoutError={logoutError}
          />
        )}
      </div>
    </header>
  )
}
