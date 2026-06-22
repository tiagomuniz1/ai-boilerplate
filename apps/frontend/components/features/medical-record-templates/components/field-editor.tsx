'use client'

import { useFieldArray } from 'react-hook-form'
import { MedicalRecordFieldType } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form'
import type { ITemplateFormValues } from './template-form'

const SELECT_TYPES = [MedicalRecordFieldType.SELECT, MedicalRecordFieldType.MULTISELECT]

const FIELD_TYPE_LABELS: Record<MedicalRecordFieldType, string> = {
  [MedicalRecordFieldType.TEXT]: 'Texto',
  [MedicalRecordFieldType.TEXTAREA]: 'Texto longo',
  [MedicalRecordFieldType.NUMBER]: 'Número',
  [MedicalRecordFieldType.BOOLEAN]: 'Sim/Não',
  [MedicalRecordFieldType.DATE]: 'Data',
  [MedicalRecordFieldType.SELECT]: 'Seleção única',
  [MedicalRecordFieldType.MULTISELECT]: 'Seleção múltipla',
}

function getMsg(err: unknown): string | undefined {
  return (err as { message?: string } | undefined)?.message
}

interface FieldEditorProps {
  index: number
  total: number
  control: Control<ITemplateFormValues>
  register: UseFormRegister<ITemplateFormValues>
  errors: FieldErrors<ITemplateFormValues>
  watchedType: MedicalRecordFieldType
  /** The react-hook-form array path this editor belongs to. Defaults to 'fields'. */
  fieldPath?: string
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

export function FieldEditor({
  index,
  total,
  control,
  register,
  errors,
  watchedType,
  fieldPath = 'fields',
  onMoveUp,
  onMoveDown,
  onRemove,
}: FieldEditorProps) {
  const optionsPath = `${fieldPath}.${index}.options` as any
  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: optionsPath,
  })

  // Resolve nested errors: fieldPath can be 'fields' or 'sections.N.fields'
  const fieldErrors: any = fieldPath === 'fields'
    ? (errors.fields as any)?.[index]
    : (() => {
        const parts = fieldPath.split('.')
        // sections.N.fields → errors.sections[N].fields[index]
        if (parts[0] === 'sections' && parts[2] === 'fields') {
          return (errors.sections as any)?.[Number(parts[1])]?.fields?.[index]
        }
        return undefined
      })()

  const isSelectType = SELECT_TYPES.includes(watchedType)

  return (
    <div
      className="rounded-lg border border-line bg-surface-2 p-4 flex flex-col gap-4"
      data-testid={`field-editor-${index}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-mute uppercase tracking-wide">
          Campo {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={index === 0}
            data-testid={`field-editor-move-up-${index}`}
            aria-label="Mover para cima"
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={index === total - 1}
            data-testid={`field-editor-move-down-${index}`}
            aria-label="Mover para baixo"
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            data-testid={`field-editor-remove-${index}`}
            aria-label="Remover campo"
            className="text-error hover:text-error"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor={`field-label-${fieldPath}-${index}`}>
            Rótulo <span className="text-error">*</span>
          </label>
          <Input
            id={`field-label-${fieldPath}-${index}`}
            {...register(`${fieldPath}.${index}.label` as any)}
            placeholder="Ex: Pressão arterial"
            error={getMsg(fieldErrors?.label)}
            data-testid={`field-editor-label-${index}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor={`field-type-${fieldPath}-${index}`}>
            Tipo <span className="text-error">*</span>
          </label>
          <select
            id={`field-type-${fieldPath}-${index}`}
            {...register(`${fieldPath}.${index}.type` as any)}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
            data-testid={`field-editor-type-${index}`}
          >
            {Object.values(MedicalRecordFieldType).map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {getMsg(fieldErrors?.type) && (
            <span className="text-xs text-error">{getMsg(fieldErrors?.type)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`field-required-${fieldPath}-${index}`}
          {...register(`${fieldPath}.${index}.required` as any)}
          className="h-4 w-4 rounded border-line text-accent"
          data-testid={`field-editor-required-${index}`}
        />
        <label htmlFor={`field-required-${fieldPath}-${index}`} className="text-sm text-text-dim cursor-pointer">
          Campo obrigatório
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor={`field-placeholder-${fieldPath}-${index}`}>
            Placeholder
          </label>
          <Input
            id={`field-placeholder-${fieldPath}-${index}`}
            {...register(`${fieldPath}.${index}.placeholder` as any)}
            placeholder="Texto de exemplo"
            data-testid={`field-editor-placeholder-${index}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor={`field-help-text-${fieldPath}-${index}`}>
            Texto de ajuda
          </label>
          <Input
            id={`field-help-text-${fieldPath}-${index}`}
            {...register(`${fieldPath}.${index}.helpText` as any)}
            placeholder="Dica para o usuário"
            data-testid={`field-editor-help-text-${index}`}
          />
        </div>
      </div>

      {isSelectType && (
        <div className="flex flex-col gap-2" data-testid={`field-editor-options-${index}`}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text">
              Opções <span className="text-error">*</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => appendOption({ value: '', label: '' })}
              data-testid={`field-editor-option-add-${index}`}
            >
              + Adicionar opção
            </Button>
          </div>

          {getMsg(fieldErrors?.options) && (
            <span className="text-xs text-error" data-testid={`field-editor-options-error-${index}`}>
              {getMsg(fieldErrors?.options)}
            </span>
          )}

          {options.length === 0 && (
            <p className="text-xs text-text-mute py-2" data-testid={`field-editor-options-empty-${index}`}>
              Nenhuma opção adicionada.
            </p>
          )}

          {options.map((option, optionIndex) => (
            <div key={option.id} className="flex items-start gap-2" data-testid={`field-editor-option-row-${index}-${optionIndex}`}>
              <div className="flex-1">
                <Input
                  {...register(`${fieldPath}.${index}.options.${optionIndex}.value` as any)}
                  placeholder="Valor interno"
                  error={getMsg(fieldErrors?.options?.[optionIndex]?.value)}
                  data-testid={`field-editor-option-value-${index}-${optionIndex}`}
                />
              </div>
              <div className="flex-1">
                <Input
                  {...register(`${fieldPath}.${index}.options.${optionIndex}.label` as any)}
                  placeholder="Rótulo exibido"
                  error={getMsg(fieldErrors?.options?.[optionIndex]?.label)}
                  data-testid={`field-editor-option-label-${index}-${optionIndex}`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(optionIndex)}
                data-testid={`field-editor-option-remove-${index}-${optionIndex}`}
                aria-label="Remover opção"
                className="text-error hover:text-error mt-0.5"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
