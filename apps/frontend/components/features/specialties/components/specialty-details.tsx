'use client'

import Link from 'next/link'
import { UserRole } from '@app/shared'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { useAuthStore } from '@/stores/auth.store'
import type { ISpecialtyModel } from '../types/specialty-model.types'

interface SpecialtyDetailsProps {
  specialty: ISpecialtyModel
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

export function SpecialtyDetails({ specialty, onDeleteClick }: SpecialtyDetailsProps) {
  const basePath = useBasePath()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === UserRole.PLATFORM_ADMIN

  return (
    <div className="flex flex-col gap-6" data-testid="specialty-details">
      <div className="flex items-start justify-between gap-4">
        <Typography variant="h2" data-testid="specialty-details-name">
          {specialty.name}
        </Typography>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link href={`${basePath}/specialties/${specialty.id}/edit`}>
              <Button variant="ghost" size="sm" data-testid="specialty-details-edit-button">
                Editar
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={onDeleteClick}
              data-testid="specialty-details-delete-button"
              className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrado em"
              value={specialty.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="specialty-details-created-at"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Atualizado em"
              value={specialty.updatedAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="specialty-details-updated-at"
            />
          </div>
          {specialty.titleName && (
            <div className="bg-surface px-6 py-4 sm:col-span-2">
              <DetailRow
                label="Título do especialista"
                value={specialty.titleName}
                testId="specialty-details-title-name"
              />
            </div>
          )}
          {specialty.description && (
            <div className="bg-surface px-6 py-4 sm:col-span-2">
              <DetailRow
                label="Descrição"
                value={specialty.description}
                testId="specialty-details-description"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
