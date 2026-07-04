'use client'

import { PatientGender } from '@app/shared'
import { formatPhone } from '@/lib/format-phone'
import { formatCpf } from '@/lib/format-cpf'
import { calculateAge } from '@/lib/calculate-age'
import type { IAppointmentPatientModel } from '../types/appointment-model.types'

const genderLabel: Record<PatientGender, string> = {
  [PatientGender.MALE]: 'Masculino',
  [PatientGender.FEMALE]: 'Feminino',
  [PatientGender.OTHER]: 'Outro',
}

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
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

function DocumentRow({
  label,
  count,
  testId,
  onClick,
}: {
  label: string
  count: number
  testId: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex items-center justify-between w-full py-3 border-b border-border last:border-b-0 text-left hover:bg-surface-2 rounded px-2 -mx-2 transition-colors"
    >
      <span className="text-sm font-medium text-text">{label}</span>
      <span className="flex items-center gap-2 text-text-mute">
        <span className="text-sm font-semibold" data-testid={`${testId}-count`}>
          {count}
        </span>
        <ChevronRight />
      </span>
    </button>
  )
}

interface ResumoTabProps {
  patient: IAppointmentPatientModel
  prescriptionCount?: number
  showPrescriptions: boolean
  certificateCount?: number
  showCertificates: boolean
  examCount?: number
  showExames: boolean
  onNavigate: (tab: string) => void
}

export function ResumoTab({
  patient,
  prescriptionCount,
  showPrescriptions,
  certificateCount,
  showCertificates,
  examCount,
  showExames,
  onNavigate,
}: ResumoTabProps) {
  const birthDateFormatted = patient.birthDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const age = calculateAge(patient.birthDate)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="resumo-tab">
      <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5" data-testid="patient-info-card">
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
            value={`${birthDateFormatted} (${age} anos)`}
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
      </div>

      <div className="rounded-xl border border-border bg-surface p-5" data-testid="resumo-tab-documents">
        <h2 className="text-base font-semibold text-text mb-4">Documentos da consulta</h2>
        <div>
          {showPrescriptions && (
            <DocumentRow
              label="Receitas"
              count={prescriptionCount ?? 0}
              testId="resumo-tab-prescriptions"
              onClick={() => onNavigate('receitas')}
            />
          )}
          {showCertificates && (
            <DocumentRow
              label="Atestados"
              count={certificateCount ?? 0}
              testId="resumo-tab-atestados"
              onClick={() => onNavigate('atestados')}
            />
          )}
          {showExames && (
            <DocumentRow
              label="Exames"
              count={examCount ?? 0}
              testId="resumo-tab-exames"
              onClick={() => onNavigate('exames')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
