'use client'

import { useState } from 'react'
import { useHeaderUser } from './hooks/use-header-user.hook'
import { useLogout } from './hooks/use-logout.hook'
import { HeaderUserMenu } from './components/header-user-menu'
import { HeaderMobileMenu } from './components/header-mobile-menu'
import { ThemeToggle } from '@/components/ui/molecules/theme-toggle/theme-toggle'
import type { IHeaderProps } from './types/header.types'

export function Header({ variant = 'default' }: IHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated } = useHeaderUser()
  const { logout, isPending, error: logoutError } = useLogout()

  return (
    <header
      data-testid="header"
      className="flex items-center border-b border-line bg-bg transition-all"
      style={{ padding: variant === 'default' ? '18px 24px' : '12px 24px' }}
    >
      <HeaderMobileMenu
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex items-center gap-[10px] ml-auto" data-testid="header-actions">
        <ThemeToggle />

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
