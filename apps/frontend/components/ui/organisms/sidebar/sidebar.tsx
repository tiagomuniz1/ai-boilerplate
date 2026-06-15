'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'
import { useCurrentClinic } from '@/components/features/clinics/hooks/use-current-clinic.hook'
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
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isBackoffice = pathname?.startsWith('/backoffice') ?? false
  const clinicName = isBackoffice ? 'Backoffice' : (clinic?.name ?? 'Umi')
  const clinicInitial = clinicName.charAt(0).toUpperCase()

  return (
    <aside
      data-testid="sidebar"
      className="flex flex-col w-64 border-r border-line bg-bg shrink-0"
      style={{ padding: '20px 14px 16px' }}
    >
      <div className="flex items-center gap-[10px] pb-5 px-2">
        {clinic?.logoUrl ? (
          <div data-testid="sidebar-logo" className="flex-1 min-w-0">
            <img
              src={clinic.logoUrl}
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
  )
}
