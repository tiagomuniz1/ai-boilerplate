'use client'

import Link from 'next/link'
import { COUNCIL_TYPE_OCCUPATION_LABELS, UserRole } from '@app/shared'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { cn } from '@/lib/cn'
import type { IUserModel } from '../types/user-model.types'

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const roleBadge: Record<UserRole, { label: string; className: string }> = {
  [UserRole.ADMIN]: {
    label: 'Admin',
    className: 'bg-accent-soft text-accent',
  },
  [UserRole.USER]: {
    label: 'Usuário',
    className: 'border border-line text-text-dim bg-transparent',
  },
  [UserRole.PROFESSIONAL]: {
    label: 'Profissional',
    className: 'border border-line text-text-dim bg-transparent',
  },
  [UserRole.PATIENT]: {
    label: 'Paciente',
    className: 'border border-line text-text-dim bg-transparent',
  },
  [UserRole.PLATFORM_ADMIN]: {
    label: 'Platform Admin',
    className: 'bg-accent-soft text-accent',
  },
}

function professionLabel(user: IUserModel): string {
  return user.councilType ? COUNCIL_TYPE_OCCUPATION_LABELS[user.councilType] : 'Profissional'
}

export { getInitials, roleBadge, professionLabel }

export interface UserTableRowProps {
  user: IUserModel
  isCurrentUser: boolean
  onDeleteClick: (user: IUserModel) => void
}

export function UserTableRow({ user, isCurrentUser, onDeleteClick }: UserTableRowProps) {
  const basePath = useBasePath()
  const badge = roleBadge[user.role]

  return (
    <tr
      data-testid={`user-table-row-${user.id}`}
      className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-soft text-xs font-semibold text-warm select-none">
            {getInitials(user.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate" data-testid={`user-name-${user.id}`}>
              {user.fullName}
            </p>
            <p className="text-xs text-text-dim truncate" data-testid={`user-email-${user.id}`}>
              {user.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4" data-testid={`user-status-${user.id}`}>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            user.isActive
              ? 'bg-good-soft text-good'
              : 'bg-danger-soft text-danger',
          )}
        >
          {user.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </td>

      <td className="px-6 py-4" data-testid={`user-role-${user.id}`}>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </td>

      <td className="px-6 py-4" data-testid={`user-profiles-${user.id}`}>
        <div className="flex items-center gap-1.5">
          {user.isProfessional && (
            <span
              className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent"
              data-testid={`user-profile-professional-${user.id}`}
            >
              {professionLabel(user)}
            </span>
          )}
          {user.isPatient && (
            <span
              className="inline-flex items-center rounded-full bg-warm-soft px-2.5 py-0.5 text-xs font-medium text-warm"
              data-testid={`user-profile-patient-${user.id}`}
            >
              Paciente
            </span>
          )}
          {!user.isProfessional && !user.isPatient && (
            <span className="text-xs text-text-mute">—</span>
          )}
        </div>
      </td>

      <td className="hidden px-6 py-4 text-sm text-text-dim whitespace-nowrap lg:table-cell" data-testid={`user-created-at-${user.id}`}>
        {user.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteClick(user)}
            disabled={isCurrentUser}
            title={isCurrentUser ? 'Não é possível excluir o próprio usuário' : undefined}
            data-testid={`user-delete-button-${user.id}`}
            className="text-xs text-danger hover:text-danger/80"
          >
            Excluir
          </Button>
          <Link
            href={`${basePath}/users/${user.id}/edit`}
            data-testid={`user-edit-link-${user.id}`}
            className="text-xs text-text-mute hover:text-text transition-colors"
          >
            Editar
          </Link>
          <Link
            href={`${basePath}/users/${user.id}`}
            data-testid={`user-view-link-${user.id}`}
            className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
            aria-label={`Ver detalhes de ${user.fullName}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </td>
    </tr>
  )
}
