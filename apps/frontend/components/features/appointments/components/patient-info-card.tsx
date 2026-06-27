'use client'

import { PatientGender } from '@app/shared'
import { formatPhone } from '@/lib/format-phone'
import { formatCpf } from '@/lib/format-cpf'
import type { IAppointmentPatientModel } from '../types/appointment-model.types'

const genderLabel: Record<PatientGender, string> = {
  [PatientGender.MALE]: 'Masculino',
  [PatientGender.FEMALE]: 'Feminino',
  [PatientGender.OTHER]: 'Outro',
}

interface DetailRowProps {
  label: string
  value: string
  testId: string
}

function DetailRow({ label, value, testId }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-mute">{label}</span>
      <span className="text-sm text-text" data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

interface PatientInfoCardProps {
  patient: IAppointmentPatientModel
}

export function PatientInfoCard({ patient }: PatientInfoCardProps) {
  const birthDateFormatted = patient.birthDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section data-testid="patient-info-card">
      <h2 className="text-base font-semibold text-text mb-4">Dados do Paciente</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailRow label="Nome" value={patient.fullName} testId="patient-info-name" />
        <DetailRow label="E-mail" value={patient.email} testId="patient-info-email" />
        <DetailRow
          label="Telefone"
          value={formatPhone(patient.phoneNumber)}
          testId="patient-info-phone"
        />
        <DetailRow
          label="Data de nascimento"
          value={birthDateFormatted}
          testId="patient-info-birthdate"
        />
        <DetailRow
          label="CPF"
          value={formatCpf(patient.documentNumber)}
          testId="patient-info-cpf"
        />
        <DetailRow
          label="Sexo"
          value={genderLabel[patient.gender] ?? patient.gender}
          testId="patient-info-gender"
        />
      </div>
    </section>
  )
}
