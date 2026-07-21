'use client'

import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IProfessionalModel } from '../types/professional-model.types'

interface ProfessionalDetailsProps {
  professional: IProfessionalModel
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

export function ProfessionalDetails({ professional, onDeleteClick }: ProfessionalDetailsProps) {
  const basePath = useBasePath()

  return (
    <div className="flex flex-col gap-6" data-testid="professional-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2" data-testid="professional-details-name">
            {professional.user.fullName}
          </Typography>
          <p className="mt-0.5 text-sm text-text-dim" data-testid="professional-details-email">
            {professional.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`${basePath}/professionals/${professional.id}/edit`}>
            <Button variant="ghost" size="sm" data-testid="professional-details-edit-button">
              Editar
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={onDeleteClick}
            data-testid="professional-details-delete-button"
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
              <span className="text-xs font-medium uppercase tracking-wider text-text-mute">CRM</span>
              <div data-testid="professional-details-crm" className="flex flex-wrap gap-1 pt-0.5">
                {professional.registrations.map((crm) => (
                  <span
                    key={crm.id}
                    data-testid={`professional-details-crm-badge-${crm.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                  >
                    {crm.number}/{crm.state}
                    {crm.isPrimary && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-accent">principal</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-surface px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Especialidades
              </span>
              <div
                data-testid="professional-details-specialties"
                className="flex flex-wrap gap-1 pt-0.5"
              >
                {professional.specialties.map((s) => (
                  <span
                    key={s.id}
                    data-testid={`professional-details-specialty-badge-${s.id}`}
                    className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                  >
                    {s.name}
                    {s.registryNumber && <span className="ml-1 text-text-mute">— RQE {s.registryNumber}</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrado em"
              value={professional.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="professional-details-created-at"
            />
          </div>
          {professional.bio && (
            <div className="bg-surface px-6 py-4 sm:col-span-2">
              <DetailRow label="Bio" value={professional.bio} testId="professional-details-bio" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
