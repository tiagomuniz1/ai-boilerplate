'use client'

import { COUNCIL_TYPE_LABELS } from '@app/shared'
import { usePrescriptionVerification } from '../hooks/use-prescription-verification.hook'
import type { IPrescriptionVerificationItem } from '../types/prescription-verification.types'

interface PrescriptionVerificationProps {
  token: string
}

export function PrescriptionVerification({ token }: PrescriptionVerificationProps) {
  const { data, isLoading, isError } = usePrescriptionVerification(token)

  return (
    <main className="flex min-h-screen items-start justify-center bg-bg p-4 sm:items-center">
      <div className="w-full max-w-xl py-8">
        {isLoading && <VerificationSkeleton />}
        {isError && <VerificationInvalid />}
        {!isLoading && !isError && data && (
          <div
            className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6"
            data-testid="verification-success"
          >
            <header className="flex flex-col gap-1 border-b border-line pb-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Verificação de receita
              </p>
              <h1 className="text-lg font-semibold text-text" data-testid="verification-clinic">
                {data.clinicName}
              </h1>
              <p className="text-sm text-text-dim">
                Receita autêntica emitida por esta clínica.
              </p>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Profissional">
                <span data-testid="verification-professional">{data.professionalName}</span>
                <span className="block text-sm text-text-dim">
                  {COUNCIL_TYPE_LABELS[data.professionalCouncilType]} {data.professionalRegistrationNumber}
                </span>
                {data.specialtyName && (
                  <span className="block text-sm text-text-dim">{data.specialtyName}</span>
                )}
              </Field>
              <Field label="Emitida em">
                <span data-testid="verification-date">
                  {data.issuedAt.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </Field>
              <Field label="Paciente">
                <span data-testid="verification-patient">{data.patientNameMasked}</span>
                <span className="block text-sm text-text-dim">
                  CPF {data.patientDocumentMasked}
                </span>
              </Field>
            </section>

            <section className="flex flex-col gap-2 border-t border-line pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Medicações
              </p>
              <ul className="flex flex-col gap-3" data-testid="verification-items">
                {data.items.map((item, index) => (
                  <MedicationRow key={index} item={item} />
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

function MedicationRow({ item }: { item: IPrescriptionVerificationItem }) {
  const title = item.dosage ? `${item.name} ${item.dosage}` : item.name
  return (
    <li className="rounded-lg border border-line bg-bg p-3" data-testid="verification-item">
      <p className="font-medium text-text">{title}</p>
      {item.activeIngredient && (
        <p className="text-sm text-text-dim">{item.activeIngredient}</p>
      )}
      {item.quantity && (
        <p className="text-sm text-text-dim">Quantidade: {item.quantity}</p>
      )}
    </li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-text-mute">{label}</p>
      <div className="font-medium text-text">{children}</div>
    </div>
  )
}

function VerificationSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6"
      data-testid="verification-loading"
    >
      <div className="h-6 w-1/2 animate-pulse rounded bg-line" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
      <div className="h-20 w-full animate-pulse rounded bg-line" />
      <div className="h-16 w-full animate-pulse rounded bg-line" />
    </div>
  )
}

function VerificationInvalid() {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-8 text-center"
      data-testid="verification-invalid"
    >
      <h1 className="text-lg font-semibold text-text">Receita não encontrada ou inválida</h1>
      <p className="text-sm text-text-dim">
        Não foi possível verificar esta receita. Confirme se o QR Code foi lido corretamente.
      </p>
    </div>
  )
}
