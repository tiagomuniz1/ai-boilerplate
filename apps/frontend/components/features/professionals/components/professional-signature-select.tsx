'use client'

import { COUNCIL_TYPE_LABELS } from '@app/shared'
import { cn } from '@/lib/cn'
import { useProfessional } from '../hooks/use-professional.hook'

export interface ProfessionalSignatureSelectProps {
  professionalId: string
  registrationId: string
  specialtyId: string
  onRegistrationIdChange: (value: string) => void
  onSpecialtyIdChange: (value: string) => void
}

const selectClassName = cn(
  'h-10 w-full rounded-md px-3 text-sm',
  'bg-surface border border-line text-text',
  'transition-colors duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
)

/**
 * Optional registration / specialty pickers for signing a prescription, certificate or exam request.
 *
 * Defaults ("") mean "use the primary registration" and "use the appointment's specialty" — the
 * backend resolves those fallbacks. The pickers only appear when the professional has more than one
 * option to choose from. Fetches the professional by id (cached via React Query) and renders nothing
 * until loaded.
 */
export function ProfessionalSignatureSelect({
  professionalId,
  registrationId,
  specialtyId,
  onRegistrationIdChange,
  onSpecialtyIdChange,
}: ProfessionalSignatureSelectProps) {
  const { data: professional } = useProfessional(professionalId)

  if (!professional) return null

  const showRegistration = professional.registrations.length > 1
  const showSpecialty = professional.specialties.length > 1

  if (!showRegistration && !showSpecialty) return null

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-3"
      data-testid="professional-signature-select"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Assinatura</p>

      {showRegistration && (
        <div className="flex flex-col gap-1">
          <label htmlFor="professional-signature-crm" className="text-xs text-text-mute">
            Registro profissional
          </label>
          <select
            id="professional-signature-crm"
            value={registrationId}
            onChange={(event) => onRegistrationIdChange(event.target.value)}
            className={selectClassName}
            data-testid="professional-signature-crm"
          >
            <option value="">Registro principal</option>
            {professional.registrations.map((registration) => (
              <option key={registration.id} value={registration.id}>
                {COUNCIL_TYPE_LABELS[registration.councilType]} {registration.number}/{registration.state}
                {registration.isPrimary ? ' (principal)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {showSpecialty && (
        <div className="flex flex-col gap-1">
          <label htmlFor="professional-signature-specialty" className="text-xs text-text-mute">
            Assinar como
          </label>
          <select
            id="professional-signature-specialty"
            value={specialtyId}
            onChange={(event) => onSpecialtyIdChange(event.target.value)}
            className={selectClassName}
            data-testid="professional-signature-specialty"
          >
            <option value="">Especialidade da consulta</option>
            {professional.specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
                {specialty.registryNumber ? ` — RQE ${specialty.registryNumber}` : ' — sem RQE'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
