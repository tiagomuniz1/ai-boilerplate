'use client'

import { cn } from '@/lib/cn'
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'
import { SidebarItem } from './sidebar-item'
import { SidebarToggle } from './sidebar-toggle'

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Sidebar() {
  const { items, isCollapsed, toggle } = useSidebarNavigation()
  const user = useAuthStore((state) => state.user)

  return (
    <aside
      data-testid="sidebar"
      data-collapsed={isCollapsed}
      className={cn(
        'flex flex-col border-r border-line bg-surface transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64',
      )}
      style={{ padding: '20px 14px 16px' }}
    >
      <div
        className={cn(
          'flex items-center gap-[10px] pb-5 px-2',
          isCollapsed && 'flex-col gap-2 px-0',
        )}
      >
        <div
          data-testid="sidebar-logo"
          className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0 text-sm font-semibold"
          style={{ background: 'linear-gradient(155deg, var(--accent), var(--warm))', color: '#0B1220' }}
        >
          U
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div
              className="truncate"
              style={{ fontFamily: 'var(--font-fraunces)', fontSize: '19px', letterSpacing: '-0.02em' }}
            >
              Umi
            </div>
            <div className="truncate text-text-mute" style={{ fontSize: '11px', marginTop: '1px' }}>
              Backoffice Clínico
            </div>
          </div>
        )}

        <SidebarToggle isCollapsed={isCollapsed} onToggle={toggle} />
      </div>

      <nav className="flex flex-col gap-1 flex-1" data-testid="sidebar-nav">
        {items.map((item) => (
          <SidebarItem key={item.id} item={item} isCollapsed={isCollapsed} />
        ))}
      </nav>

      {user && (
        <div data-testid="sidebar-user" className="border-t border-line pt-3 mt-2">
          <div className="flex items-center gap-[10px] p-1.5">
            <div
              data-testid="sidebar-user-avatar"
              className="w-[34px] h-[34px] rounded-full bg-warm-soft text-warm grid place-items-center shrink-0 font-medium"
              style={{ fontSize: '12.5px', fontFamily: 'var(--font-fraunces)' }}
            >
              {getInitials(user.fullName)}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0" data-testid="sidebar-user-info">
                <div className="text-sm truncate text-text">{user.fullName}</div>
                <div className="truncate text-text-mute" style={{ fontSize: '11px' }}>
                  {user.email}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
