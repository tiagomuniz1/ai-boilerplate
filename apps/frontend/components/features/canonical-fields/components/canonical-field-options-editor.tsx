'use client'

import { useFieldArray, type Control, type FieldErrors } from 'react-hook-form'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'

export interface OptionsFormValues {
  options: { value: string; label: string }[]
}

interface CanonicalFieldOptionsEditorProps {
  control: Control<any>
  errors: FieldErrors<any>
}

export function CanonicalFieldOptionsEditor({ control, errors }: CanonicalFieldOptionsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })

  const optionsError = (errors.options as any)?.message as string | undefined

  return (
    <div className="flex flex-col gap-3" data-testid="canonical-field-options-editor">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">
          Opções
          <span className="ml-1 text-xs text-danger">*</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ value: '', label: '' })}
          data-testid="canonical-field-options-add"
        >
          + Adicionar opção
        </Button>
      </div>

      {optionsError && (
        <span role="alert" className="text-xs text-danger" data-testid="canonical-field-options-error">
          {optionsError}
        </span>
      )}

      {fields.length === 0 && (
        <p className="text-sm text-text-mute" data-testid="canonical-field-options-empty">
          Nenhuma opção adicionada.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2" data-testid={`canonical-field-option-row-${index}`}>
          <Input
            label="Valor"
            id={`options.${index}.value`}
            placeholder="ex: low"
            error={(errors.options as any)?.[index]?.value?.message}
            data-testid={`canonical-field-option-value-${index}`}
            {...control.register(`options.${index}.value`)}
          />
          <Input
            label="Rótulo"
            id={`options.${index}.label`}
            placeholder="ex: Baixo"
            error={(errors.options as any)?.[index]?.label?.message}
            data-testid={`canonical-field-option-label-${index}`}
            {...control.register(`options.${index}.label`)}
          />
          <button
            type="button"
            onClick={() => remove(index)}
            className="mt-6 flex-shrink-0 rounded p-1.5 text-danger hover:bg-danger/10 transition-colors"
            aria-label={`Remover opção ${index + 1}`}
            data-testid={`canonical-field-option-remove-${index}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
