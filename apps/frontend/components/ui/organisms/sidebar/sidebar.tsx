'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'
import { useCurrentClinic } from '@/components/features/clinics/hooks/use-current-clinic.hook'
import { useSlug } from '@/lib/slug-context'
import { useThemeStore } from '@/stores/theme.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { cn } from '@/lib/cn'
import { SidebarItem } from './sidebar-item'

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Sidebar() {
  const { items } = useSidebarNavigation()
  const user = useAuthStore((state) => state.user)
  const { data: clinic } = useCurrentClinic()
  const theme = useThemeStore((s) => s.theme)
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const isMobileOpen = useSidebarStore((s) => s.isMobileOpen)
  const closeMobile = useSidebarStore((s) => s.closeMobile)
  const previousPathnameRef = useRef(pathname)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname
      closeMobile()
    }
  }, [pathname, closeMobile])

  // The slug, not the pathname. In subdomain-mode the middleware rewrites
  // backoffice.example.com/themes to /backoffice/themes internally, but
  // usePathname() reports the external '/themes' — so a pathname check is false
  // in production and true only in path-mode local dev, and the backoffice ends
  // up wearing the clinic's branding block instead of the Pulso logo.
  const isBackoffice = useSlug() === 'backoffice'
  const clinicName = isBackoffice ? 'Backoffice' : (clinic?.name ?? 'Clínica')
  const clinicInitial = clinicName.charAt(0).toUpperCase()
  const logoUrl = (theme === 'dark' && clinic?.logoDarkUrl) ? clinic.logoDarkUrl : clinic?.logoUrl

  return (
    <>
      {isMobileOpen && (
        <div
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        data-testid="sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-line bg-bg',
          'transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:z-auto md:shrink-0 md:translate-x-0 md:transition-none',
        )}
        style={{ padding: '20px 14px 16px' }}
      >
      <div className="flex items-center gap-[10px] pb-5 px-2">
        {isBackoffice ? (
          <div data-testid="sidebar-logo" className="flex-1 min-w-0">
            <img
              src="/brand/pulso-logo-light.png"
              alt="Pulso"
              className="w-full h-auto object-contain object-left dark:hidden"
            />
            <img
              src="/brand/pulso-logo-dark.png"
              alt="Pulso"
              className="hidden w-full h-auto object-contain object-left dark:block"
            />
          </div>
        ) : logoUrl ? (
          <div data-testid="sidebar-logo" className="flex-1 min-w-0">
            <img
              src={logoUrl}
              alt={clinicName}
              className="w-full h-auto object-contain object-left"
            />
          </div>
        ) : (
          <>
            <div
              data-testid="sidebar-logo"
              className="w-9 h-9 rounded-[10px] shrink-0 overflow-hidden"
            >
              <div
                className="w-full h-full grid place-items-center text-sm font-semibold"
                style={{ background: 'linear-gradient(155deg, var(--accent), var(--warm))', color: '#0B1220' }}
              >
                {clinicInitial}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div
                data-testid="sidebar-clinic-name"
                className="truncate"
                style={{ fontFamily: 'var(--font-fraunces)', fontSize: '17px', letterSpacing: '-0.02em' }}
              >
                {clinicName}
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="flex flex-col gap-1 flex-1" data-testid="sidebar-nav">
        {items.map((item) => (
          <SidebarItem key={item.id} item={item} />
        ))}
      </nav>

      {mounted && user && (
        <div data-testid="sidebar-user" className="border-t border-line pt-3 mt-2">
          <div className="flex items-center gap-[10px] p-1.5">
            <div
              data-testid="sidebar-user-avatar"
              className="w-[34px] h-[34px] rounded-full bg-warm-soft text-warm grid place-items-center shrink-0 font-medium"
              style={{ fontSize: '12.5px', fontFamily: 'var(--font-fraunces)' }}
            >
              {getInitials(user.fullName)}
            </div>

            <div className="flex-1 min-w-0" data-testid="sidebar-user-info">
              <div className="text-sm truncate text-text">{user.fullName}</div>
              <div className="truncate text-text-mute" style={{ fontSize: '11px' }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
      )}
      </aside>
    </>
  )
}
