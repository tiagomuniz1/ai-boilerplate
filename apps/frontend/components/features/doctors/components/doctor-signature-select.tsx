'use client'

import { cn } from '@/lib/cn'
import { useDoctor } from '../hooks/use-doctor.hook'

export interface DoctorSignatureSelectProps {
  doctorId: string
  crmId: string
  specialtyId: string
  onCrmIdChange: (value: string) => void
  onSpecialtyIdChange: (value: string) => void
}

const selectClassName = cn(
  'h-10 w-full rounded-md px-3 text-sm',
  'bg-surface border border-line text-text',
  'transition-colors duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
)

/**
 * Optional CRM / specialty pickers for signing a prescription, certificate or exam request.
 *
 * Defaults ("") mean "use the primary CRM" and "use the appointment's specialty" — the backend
 * resolves those fallbacks. The pickers only appear when the doctor has more than one option to
 * choose from. Fetches the doctor by id (cached via React Query) and renders nothing until loaded.
 */
export function DoctorSignatureSelect({
  doctorId,
  crmId,
  specialtyId,
  onCrmIdChange,
  onSpecialtyIdChange,
}: DoctorSignatureSelectProps) {
  const { data: doctor } = useDoctor(doctorId)

  if (!doctor) return null

  const showCrm = doctor.crms.length > 1
  const showSpecialty = doctor.specialties.length > 1

  if (!showCrm && !showSpecialty) return null

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-3"
      data-testid="doctor-signature-select"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Assinatura</p>

      {showCrm && (
        <div className="flex flex-col gap-1">
          <label htmlFor="doctor-signature-crm" className="text-xs text-text-mute">
            CRM
          </label>
          <select
            id="doctor-signature-crm"
            value={crmId}
            onChange={(event) => onCrmIdChange(event.target.value)}
            className={selectClassName}
            data-testid="doctor-signature-crm"
          >
            <option value="">CRM principal</option>
            {doctor.crms.map((crm) => (
              <option key={crm.id} value={crm.id}>
                {crm.number}/{crm.state}
                {crm.isPrimary ? ' (principal)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {showSpecialty && (
        <div className="flex flex-col gap-1">
          <label htmlFor="doctor-signature-specialty" className="text-xs text-text-mute">
            Assinar como
          </label>
          <select
            id="doctor-signature-specialty"
            value={specialtyId}
            onChange={(event) => onSpecialtyIdChange(event.target.value)}
            className={selectClassName}
            data-testid="doctor-signature-specialty"
          >
            <option value="">Especialidade da consulta</option>
            {doctor.specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
                {specialty.rqe ? ` — RQE ${specialty.rqe}` : ' — sem RQE'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
