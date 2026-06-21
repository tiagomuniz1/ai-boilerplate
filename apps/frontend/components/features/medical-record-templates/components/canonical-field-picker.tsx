'use client'

import { MedicalRecordFieldType } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import { useCanonicalFields } from '../hooks/use-canonical-fields.hook'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

const FIELD_TYPE_LABELS: Record<MedicalRecordFieldType, string> = {
  [MedicalRecordFieldType.TEXT]: 'Texto',
  [MedicalRecordFieldType.TEXTAREA]: 'Texto longo',
  [MedicalRecordFieldType.NUMBER]: 'Número',
  [MedicalRecordFieldType.BOOLEAN]: 'Sim/Não',
  [MedicalRecordFieldType.DATE]: 'Data',
  [MedicalRecordFieldType.SELECT]: 'Seleção única',
  [MedicalRecordFieldType.MULTISELECT]: 'Seleção múltipla',
}

interface CanonicalFieldPickerProps {
  specialtyId?: string
  onAdopt: (field: ICanonicalFieldModel) => void
}

export function CanonicalFieldPicker({ specialtyId, onAdopt }: CanonicalFieldPickerProps) {
  const { data: canonicalFields, isPending, isError } = useCanonicalFields(specialtyId)

  if (isPending) {
    return (
      <div className="text-sm text-text-mute py-2" data-testid="canonical-field-picker-loading">
        Carregando campos canônicos...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-sm text-error py-2" data-testid="canonical-field-picker-error">
        Não foi possível carregar os campos canônicos.
      </div>
    )
  }

  if (!canonicalFields || canonicalFields.length === 0) {
    return (
      <div className="text-sm text-text-mute py-2" data-testid="canonical-field-picker-empty">
        Nenhum campo canônico disponível para esta especialidade.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" data-testid="canonical-field-picker">
      {canonicalFields.map((field) => (
        <div
          key={field.id}
          className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3"
          data-testid={`canonical-field-picker-item-${field.id}`}
        >
          <div>
            <p className="text-sm font-medium text-text">{field.label}</p>
            <p className="text-xs text-text-mute">
              {FIELD_TYPE_LABELS[field.type]} · {field.canonicalKey}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAdopt(field)}
            data-testid={`canonical-field-picker-adopt-${field.id}`}
          >
            Adotar
          </Button>
        </div>
      ))}
    </div>
  )
}
