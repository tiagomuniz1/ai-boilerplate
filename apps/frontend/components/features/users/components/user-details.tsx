'use client'

import Link from 'next/link'
import { UserRole } from '@app/shared'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { cn } from '@/lib/cn'
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from '@/lib/user-role-labels'
import { primaryProfessionLabel, primaryRegistrationLabel } from '@/components/features/professionals/utils/profession-label'
import { useProfessionalByUserId } from '../hooks/use-professional-by-user-id.hook'
import type { IUserModel } from '../types/user-model.types'

interface UserDetailsProps {
  user: IUserModel
  canDelete: boolean
  onDeleteClick: () => void
}

function DetailRow({
  label,
  value,
  description,
  testId,
}: {
  label: string
  value: string
  description?: string
  testId: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-mute">{label}</span>
      <span className="text-sm text-text" data-testid={testId}>
        {value}
      </span>
      {description && <span className="text-xs text-text-dim">{description}</span>}
    </div>
  )
}

export function UserDetails({ user, canDelete, onDeleteClick }: UserDetailsProps) {
  const basePath = useBasePath()
  const isProfessional = user.role === UserRole.PROFESSIONAL
  const {
    professional,
    isPending: isProfessionalPending,
    isError: isProfessionalError,
  } = useProfessionalByUserId(user.id, { enabled: isProfessional })

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
          <Link href={`${basePath}/users/${user.id}/edit`}>
            <Button variant="ghost" size="sm" data-testid="user-details-edit-button">
              Editar
            </Button>
          </Link>
          {canDelete && (
            <Button
              variant="primary"
              size="sm"
              onClick={onDeleteClick}
              data-testid="user-details-delete-button"
              className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
            >
              Excluir
            </Button>
          )}
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
              label="Perfil de acesso"
              value={USER_ROLE_LABELS[user.role]}
              description={USER_ROLE_DESCRIPTIONS[user.role]}
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
          {isProfessional && isProfessionalPending && (
            <div className="bg-surface px-6 py-4" data-testid="user-details-profession-cell">
              <Skeleton height={16} className="w-40" />
            </div>
          )}
          {isProfessional && !isProfessionalPending && !isProfessionalError && professional && (
            <div className="bg-surface px-6 py-4" data-testid="user-details-profession-cell">
              <DetailRow
                label="Profissão"
                value={`${primaryProfessionLabel(professional.registrations)} (${primaryRegistrationLabel(professional.registrations)})`}
                testId="user-details-profession"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
