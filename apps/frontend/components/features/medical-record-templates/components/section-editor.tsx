'use client'

import { useFieldArray } from 'react-hook-form'
import { MedicalRecordFieldType } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { FieldEditor } from './field-editor'
import { CanonicalFieldPicker } from './canonical-field-picker'
import type { Control, UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import type { ITemplateFormValues } from './template-form'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

interface SectionEditorProps {
  sectionIndex: number
  totalSections: number
  control: Control<ITemplateFormValues>
  register: UseFormRegister<ITemplateFormValues>
  errors: FieldErrors<ITemplateFormValues>
  watch: UseFormWatch<ITemplateFormValues>
  specialtyId?: string
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

export function SectionEditor({
  sectionIndex,
  totalSections,
  control,
  register,
  errors,
  watch,
  specialtyId,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SectionEditorProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.fields`,
  })

  const sectionErrors = (errors.sections as any)?.[sectionIndex]
  const watchedFields = watch(`sections.${sectionIndex}.fields`)

  function handleAddField() {
    append({
      key: undefined,
      label: '',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: fields.length,
      options: [],
      placeholder: '',
      helpText: '',
      canonical: false,
      canonicalKey: '',
      sectionKey: '',
    })
  }

  function handleAdoptCanonical(canonicalField: ICanonicalFieldModel) {
    append({
      key: undefined,
      label: canonicalField.label,
      type: canonicalField.type,
      required: false,
      order: fields.length,
      options: canonicalField.options
        ? canonicalField.options.map((o) => ({ value: o.value, label: o.label }))
        : [],
      placeholder: '',
      helpText: '',
      canonical: true,
      canonicalKey: canonicalField.canonicalKey,
      sectionKey: '',
    })
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5"
      data-testid={`section-editor-${sectionIndex}`}
    >
      <div className="flex items-center gap-3">
        <Input
          {...register(`sections.${sectionIndex}.title`)}
          placeholder="Título da seção"
          error={sectionErrors?.title?.message}
          data-testid={`section-editor-title-${sectionIndex}`}
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={sectionIndex === 0}
            data-testid={`section-editor-move-up-${sectionIndex}`}
            aria-label="Mover seção para cima"
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={sectionIndex === totalSections - 1}
            data-testid={`section-editor-move-down-${sectionIndex}`}
            aria-label="Mover seção para baixo"
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            data-testid={`section-editor-remove-${sectionIndex}`}
            aria-label="Remover seção"
            className="text-error hover:text-error"
          >
            ✕
          </Button>
        </div>
      </div>

      {fields.length === 0 && (
        <div
          className="py-6 text-center rounded-lg border border-dashed border-line"
          data-testid={`section-editor-fields-empty-${sectionIndex}`}
        >
          <p className="text-sm text-text-mute">Nenhum campo nesta seção.</p>
        </div>
      )}

      {fields.map((field, fieldIndex) => (
        <FieldEditor
          key={field.id}
          index={fieldIndex}
          total={fields.length}
          control={control as any}
          register={register as any}
          errors={errors}
          watchedType={
            (watchedFields?.[fieldIndex]?.type as MedicalRecordFieldType) ?? field.type
          }
          fieldPath={`sections.${sectionIndex}.fields`}
          onMoveUp={() => move(fieldIndex, fieldIndex - 1)}
          onMoveDown={() => move(fieldIndex, fieldIndex + 1)}
          onRemove={() => remove(fieldIndex)}
        />
      ))}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddField}
          data-testid={`section-editor-add-field-${sectionIndex}`}
        >
          + Adicionar campo
        </Button>
      </div>

      <div className="border-t border-line pt-3">
        <p className="text-xs text-text-mute mb-2">Campos canônicos</p>
        <CanonicalFieldPicker
          specialtyId={specialtyId}
          onAdopt={handleAdoptCanonical}
        />
      </div>
    </div>
  )
}
