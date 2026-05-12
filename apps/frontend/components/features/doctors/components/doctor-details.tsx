'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IDoctorModel } from '../types/doctor-model.types'

interface DoctorDetailsProps {
  doctor: IDoctorModel
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

export function DoctorDetails({ doctor, onDeleteClick }: DoctorDetailsProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="doctor-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2" data-testid="doctor-details-name">
            {doctor.user.fullName}
          </Typography>
          <p className="mt-0.5 text-sm text-text-dim" data-testid="doctor-details-email">
            {doctor.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/doctors/${doctor.id}/edit`}>
            <Button variant="ghost" size="sm" data-testid="doctor-details-edit-button">
              Editar
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={onDeleteClick}
            data-testid="doctor-details-delete-button"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-6 py-4">
            <DetailRow label="CRM" value={doctor.crmNumber} testId="doctor-details-crm" />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Especialidade"
              value={doctor.specialty}
              testId="doctor-details-specialty"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrado em"
              value={doctor.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="doctor-details-created-at"
            />
          </div>
          {doctor.bio && (
            <div className="bg-surface px-6 py-4 sm:col-span-2">
              <DetailRow label="Bio" value={doctor.bio} testId="doctor-details-bio" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
