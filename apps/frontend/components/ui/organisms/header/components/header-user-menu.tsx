'use client'

import { useState } from 'react'
import type { IHeaderUserModel } from '../types/header.types'

export interface IHeaderUserMenuProps {
  user: IHeaderUserModel
  onLogout: () => Promise<void>
  isLoggingOut: boolean
  logoutError: string | null
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function HeaderUserMenu({ user, onLogout, isLoggingOut, logoutError }: IHeaderUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleAvatarClick() {
    setIsOpen((prev) => !prev)
  }

  function handleBackdropClick() {
    setIsOpen(false)
  }

  async function handleLogout() {
    await onLogout()
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="header-avatar-button"
        aria-label="Menu do usuário"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleAvatarClick}
        className="w-[34px] h-[34px] rounded-full bg-warm-soft text-warm grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{ fontSize: '12.5px', fontFamily: 'var(--font-fraunces)', fontWeight: 500 }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-full h-full rounded-full object-cover"
            data-testid="header-avatar-image"
          />
        ) : (
          <span data-testid="header-avatar-initials">{getInitials(user.fullName)}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleBackdropClick}
            aria-hidden="true"
            data-testid="header-user-menu-backdrop"
          />

          <div
            data-testid="header-user-dropdown"
            className="absolute right-0 top-full mt-1 w-52 bg-surface border border-line rounded-lg shadow-lg z-50"
          >
            <div className="px-3 py-2.5">
              <div className="text-sm font-medium text-text truncate">{user.fullName}</div>
              <div className="text-text-mute truncate" style={{ fontSize: '11px' }}>
                {user.email}
              </div>
            </div>

            <div className="border-t border-line" />

            {logoutError && (
              <div className="px-3 pb-1 pt-2">
                <p className="text-danger text-xs" data-testid="header-logout-error">
                  {logoutError}
                </p>
              </div>
            )}

            <div className="p-1">
              <button
                type="button"
                data-testid="header-logout-button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-dim hover:bg-surface-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoggingOut ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-spin"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Saindo...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sair
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
