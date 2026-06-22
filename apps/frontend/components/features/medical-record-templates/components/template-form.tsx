'use client'

import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MedicalRecordFieldType } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { FieldEditor } from './field-editor'
import { CanonicalFieldPicker } from './canonical-field-picker'
import { useSpecialties } from '@/components/features/specialties/hooks/use-specialties.hook'
import type { ITemplateModel } from '../types/template-model.types'
import type { ICreateTemplateInput, IUpdateTemplateInput, ITemplateFieldInput } from '../types/template-input.types'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { IApiError } from '@/types/api.types'

const SELECT_TYPES = [MedicalRecordFieldType.SELECT, MedicalRecordFieldType.MULTISELECT]

const optionSchema = z.object({
  value: z.string().min(1, 'Obrigatório').max(60, 'Máx. 60 caracteres'),
  label: z.string().min(1, 'Obrigatório').max(120, 'Máx. 120 caracteres'),
})

const fieldSchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1, 'Rótulo obrigatório').max(120, 'Máx. 120 caracteres'),
  type: z.nativeEnum(MedicalRecordFieldType),
  required: z.boolean(),
  order: z.number(),
  options: z.array(optionSchema),
  placeholder: z.string(),
  helpText: z.string(),
  canonical: z.boolean(),
  canonicalKey: z.string(),
})

function addFieldsRefinement<T extends z.ZodObject<any>>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const fields = data.fields as z.infer<typeof fieldSchema>[]
    fields.forEach((field, index) => {
      if (SELECT_TYPES.includes(field.type)) {
        if (!field.options || field.options.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['fields', index, 'options'],
            message: 'Adicione ao menos uma opção para este tipo de campo.',
          })
        } else {
          const values = field.options.map((o) => o.value)
          if (new Set(values).size !== values.length) {
            ctx.addIssue({
              code: 'custom',
              path: ['fields', index, 'options'],
              message: 'Os valores das opções devem ser únicos.',
            })
          }
        }
      }
    })
  })
}

const baseObjectSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120, 'Máx. 120 caracteres'),
  specialtyId: z.string().optional(),
  fields: z.array(fieldSchema).min(1, 'Adicione ao menos um campo'),
})

export type ITemplateFormValues = z.infer<typeof baseObjectSchema>

const formSchemaCreate = addFieldsRefinement(
  baseObjectSchema.extend({
    specialtyId: z.string().min(1, 'Selecione uma especialidade'),
  }),
)

const formSchemaEdit = addFieldsRefinement(baseObjectSchema)

function getMsg(err: unknown): string | undefined {
  return (err as { message?: string } | undefined)?.message
}

function toFormField(field: ITemplateFieldInput | ITemplateModel['fields'][number]): ITemplateFormValues['fields'][number] {
  return {
    /* c8 ignore next */
    key: 'key' in field ? field.key : undefined,
    label: field.label,
    type: field.type,
    required: field.required,
    order: field.order,
    options: field.options ? field.options.map((o) => ({ value: o.value, label: o.label })) : [],
    placeholder: field.placeholder ?? '',
    helpText: field.helpText ?? '',
    canonical: field.canonical,
    canonicalKey: field.canonicalKey ?? '',
  }
}

interface TemplateFormProps {
  mode: 'create'
  specialtyId?: string
  onSubmit: (data: ICreateTemplateInput) => void
  isPending: boolean
  error?: IApiError | null
  globalError?: string | null
}

interface TemplateFormEditProps {
  mode: 'edit'
  template: ITemplateModel
  specialtyId: string
  onSubmit: (data: IUpdateTemplateInput) => void
  isPending: boolean
  error?: IApiError | null
  globalError?: string | null
}

type Props = TemplateFormProps | TemplateFormEditProps

export function TemplateForm(props: Props) {
  const isEdit = props.mode === 'edit'
  const template = isEdit ? (props as TemplateFormEditProps).template : undefined

  const { data: specialtiesPaginated } = useSpecialties({ limit: 100 })
  const specialties = specialtiesPaginated?.data ?? []

  const defaultFields = template
    ? template.fields
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((f) => toFormField(f))
    : []

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ITemplateFormValues>({
    resolver: zodResolver(isEdit ? formSchemaEdit : formSchemaCreate),
    defaultValues: {
      name: template?.name ?? '',
      specialtyId: props.specialtyId ?? '',
      fields: defaultFields,
    },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'fields' })
  const watchedFields = useWatch({ control, name: 'fields' })
  const watchedSpecialtyId = useWatch({ control, name: 'specialtyId' })

  // When specialties load and a pre-selected id is provided (from URL param), apply it to the select
  useEffect(() => {
    if (!isEdit && props.specialtyId && specialties.some((s) => s.id === props.specialtyId)) {
      setValue('specialtyId', props.specialtyId)
    }
  }, [specialties, isEdit, props.specialtyId, setValue])

  const canonicalPickerSpecialtyId = isEdit ? props.specialtyId : (watchedSpecialtyId || undefined)

  function onSubmit(values: ITemplateFormValues) {
    const fieldInputs: ITemplateFieldInput[] = values.fields.map((f, i) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      order: i,
      options: f.options,
      placeholder: f.placeholder,
      helpText: f.helpText,
      canonical: f.canonical,
      canonicalKey: f.canonicalKey,
    }))

    if (isEdit) {
      ;(props as TemplateFormEditProps).onSubmit({ name: values.name, fields: fieldInputs })
    } else {
      ;(props as TemplateFormProps).onSubmit({
        specialtyId: values.specialtyId!,
        name: values.name,
        fields: fieldInputs,
      })
    }
  }

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
    })
  }

  function handleAdoptCanonicalField(canonicalField: ICanonicalFieldModel) {
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
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" data-testid="template-form">
      {props.globalError && (
        <Alert variant="error" data-testid="template-form-global-error">
          {props.globalError}
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text" htmlFor="template-name">
          Nome do modelo <span className="text-error">*</span>
        </label>
        <Input
          id="template-name"
          {...register('name')}
          placeholder="Ex: Anamnese Cardiológica"
          error={errors.name?.message}
          data-testid="template-form-name"
        />
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor="template-specialty">
            Especialidade <span className="text-error">*</span>
          </label>
          <select
            id="template-specialty"
            {...register('specialtyId')}
            aria-invalid={!!errors.specialtyId}
            data-testid="template-form-specialty"
            className="h-10 w-full rounded-md px-3 text-base bg-surface border border-line text-text transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg aria-[invalid=true]:border-danger"
          >
            <option value="">Selecione uma especialidade</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.specialtyId && (
            <span role="alert" className="text-xs text-danger" data-testid="template-form-specialty-error">
              {errors.specialtyId.message}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Campos</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddField}
            data-testid="template-form-add-field"
          >
            + Adicionar campo
          </Button>
        </div>

        {getMsg(errors.fields) && typeof errors.fields?.message === 'string' && (
          <Alert variant="error" data-testid="template-form-fields-error">
            {errors.fields.message}
          </Alert>
        )}

        {fields.length === 0 && (
          <div className="py-8 text-center rounded-lg border border-dashed border-line" data-testid="template-form-fields-empty">
            <p className="text-sm text-text-mute">Nenhum campo adicionado. Use os botões acima para adicionar campos.</p>
          </div>
        )}

        {fields.map((field, index) => (
          <FieldEditor
            key={field.id}
            index={index}
            total={fields.length}
            control={control}
            register={register}
            errors={errors}
            watchedType={(watchedFields?.[index]?.type as MedicalRecordFieldType) ?? field.type}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Campos canônicos</h2>
        <p className="text-sm text-text-dim">
          Adote campos padronizados da plataforma para garantir consistência entre modelos.
        </p>
        <CanonicalFieldPicker
          specialtyId={canonicalPickerSpecialtyId}
          onAdopt={handleAdoptCanonicalField}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="submit"
          variant="primary"
          isLoading={props.isPending}
          disabled={props.isPending}
          data-testid="template-form-submit"
        >
          {isEdit ? 'Salvar alterações' : 'Criar modelo'}
        </Button>
      </div>
    </form>
  )
}
