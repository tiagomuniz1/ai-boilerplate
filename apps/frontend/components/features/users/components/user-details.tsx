'use client'

import Link from 'next/link'
import { UserRole } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { cn } from '@/lib/cn'
import type { IUserModel } from '../types/user-model.types'

const roleLabel: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.USER]: 'Usuário',
}

interface UserDetailsProps {
  user: IUserModel
  onDeleteClick: () => void
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-mute">{label}</span>
      <span className="text-sm text-text" data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

export function UserDetails({ user, onDeleteClick }: UserDetailsProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="user-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2" data-testid="user-details-name">
            {user.fullName}
          </Typography>
          <p className="mt-0.5 text-sm text-text-dim" data-testid="user-details-email">
            {user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/users/${user.id}/edit`}>
            <Button variant="ghost" size="sm" data-testid="user-details-edit-button">
              Editar
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={onDeleteClick}
            data-testid="user-details-delete-button"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-text-mute">Status</span>
              <span
                className={cn(
                  'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  user.isActive ? 'bg-good-soft text-good' : 'bg-danger-soft text-danger',
                )}
                data-testid="user-details-status"
              >
                {user.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Role"
              value={roleLabel[user.role]}
              testId="user-details-role"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrado em"
              value={user.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="user-details-created-at"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
