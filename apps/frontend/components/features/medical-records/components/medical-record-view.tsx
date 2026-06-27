'use client'

import { MedicalRecordFieldType } from '@app/shared'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'

interface MedicalRecordViewProps {
  record: IMedicalRecordModel
}

function formatFieldValue(type: MedicalRecordFieldType, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'

  switch (type) {
    case MedicalRecordFieldType.BOOLEAN:
      return value ? 'Sim' : 'Não'
    case MedicalRecordFieldType.MULTISELECT:
      return Array.isArray(value) ? value.join(', ') : String(value)
    default:
      return String(value)
  }
}

export function MedicalRecordView({ record }: MedicalRecordViewProps) {
  return (
    <div className="space-y-4" data-testid="medical-record-view">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-text/60">
        <span>Paciente</span>
        <span data-testid="record-patient-name">{record.patientName}</span>
        <span>Médico</span>
        <span data-testid="record-doctor-name">{record.doctorName}</span>
        <span>Especialidade</span>
        <span data-testid="record-specialty-name">{record.specialtyName}</span>
      </div>

      <hr className="border-border" />

      <dl className="space-y-3">
        {record.schema.map((field) => {
          const raw = record.data[field.key]
          return (
            <div key={field.key} data-testid={`record-field-${field.key}`}>
              <dt className="text-xs font-medium uppercase tracking-wide text-text/50">
                {field.label}
              </dt>
              <dd className="mt-0.5 text-sm text-text">
                {formatFieldValue(field.type, raw)}
              </dd>
            </div>
          )
        })}
      </dl>

      {record.notes && (
        <div data-testid="record-notes">
          <p className="text-xs font-medium uppercase tracking-wide text-text/50">Notas do médico</p>
          <p className="mt-0.5 text-sm text-text">{record.notes}</p>
        </div>
      )}
    </div>
  )
}
