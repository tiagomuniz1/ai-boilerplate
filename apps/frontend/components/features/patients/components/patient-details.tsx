'use client'

import Link from 'next/link'
import { PatientGender } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IPatientModel } from '../types/patient-model.types'

const genderLabel: Record<PatientGender, string> = {
  [PatientGender.MALE]: 'Masculino',
  [PatientGender.FEMALE]: 'Feminino',
  [PatientGender.OTHER]: 'Outro',
}

interface PatientDetailsProps {
  patient: IPatientModel
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

export function PatientDetails({ patient, onDeleteClick }: PatientDetailsProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="patient-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2" data-testid="patient-details-name">
            {patient.fullName}
          </Typography>
          <p className="mt-0.5 text-sm text-text-dim" data-testid="patient-details-email">
            {patient.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/patients/${patient.id}/edit`}>
            <Button variant="ghost" size="sm" data-testid="patient-details-edit-button">
              Editar
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={onDeleteClick}
            data-testid="patient-details-delete-button"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Telefone"
              value={patient.phoneNumber}
              testId="patient-details-phone"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Data de nascimento"
              value={patient.birthDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              testId="patient-details-birthdate"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Documento (CPF)"
              value={patient.documentNumber}
              testId="patient-details-document"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Gênero"
              value={genderLabel[patient.gender]}
              testId="patient-details-gender"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrado em"
              value={patient.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="patient-details-created-at"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
