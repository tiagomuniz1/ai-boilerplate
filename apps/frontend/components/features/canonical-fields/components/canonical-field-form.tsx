'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MedicalRecordFieldType } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import { CanonicalFieldOptionsEditor } from './canonical-field-options-editor'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { ICreateCanonicalFieldInput, IUpdateCanonicalFieldInput } from '../types/canonical-field-input.types'

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

const optionSchema = z.object({
  value: z.string().min(1, 'Obrigatório').max(60, 'Máx. 60 caracteres'),
  label: z.string().min(1, 'Obrigatório').max(120, 'Máx. 120 caracteres'),
})

function getMsg(err: unknown): string | undefined {
  return (err as { message?: string } | undefined)?.message
}

function addOptionsRefinement<T extends z.ZodObject<any>>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const isSelect = SELECT_TYPES.includes(data.type)
    if (isSelect) {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Adicione ao menos uma opção para este tipo de campo.',
        })
      } else {
        const values = (data.options as { value: string }[]).map((o) => o.value)
        if (new Set(values).size !== values.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['options'],
            message: 'Os valores das opções devem ser únicos.',
          })
        }
      }
    }
  })
}

const baseObjectSchema = z.object({
  label: z
    .string()
    .min(2, 'Deve ter no mínimo 2 caracteres')
    .max(120, 'Deve ter no máximo 120 caracteres'),
  type: z.nativeEnum(MedicalRecordFieldType, { required_error: 'Tipo obrigatório' }),
  unit: z.string().max(20, 'Deve ter no máximo 20 caracteres').optional(),
  specialtyId: z.string().optional(),
  description: z.string().max(500, 'Deve ter no máximo 500 caracteres').optional(),
  options: z.array(optionSchema).optional(),
})

const baseSchema = addOptionsRefinement(baseObjectSchema)

const createObjectSchema = baseObjectSchema.extend({
  canonicalKey: z
    .string()
    .min(2, 'Deve ter no mínimo 2 caracteres')
    .max(60, 'Deve ter no máximo 60 caracteres')
    .regex(/^[a-z][a-z0-9_]*$/, 'Use apenas letras minúsculas, números e underscore (ex: blood_pressure)'),
})

const createSchema = addOptionsRefinement(createObjectSchema)

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof baseSchema>

export interface ISpecialtyOption {
  id: string
  name: string
}

interface CanonicalFieldFormCreateProps {
  mode: 'create'
  specialties: ISpecialtyOption[]
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateCanonicalFieldInput,
    setError: (field: keyof ICreateCanonicalFieldInput, error: { message: string }) => void,
  ) => void
}

interface CanonicalFieldFormEditProps {
  mode: 'edit'
  defaultValues: ICanonicalFieldModel
  specialties: ISpecialtyOption[]
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateCanonicalFieldInput,
    setError: (field: keyof IUpdateCanonicalFieldInput, error: { message: string }) => void,
  ) => void
}

type CanonicalFieldFormProps = CanonicalFieldFormCreateProps | CanonicalFieldFormEditProps

export function CanonicalFieldForm(props: CanonicalFieldFormProps) {
  if (props.mode === 'create') return <CanonicalFieldFormCreate {...props} />
  return <CanonicalFieldFormEdit {...props} />
}

function CanonicalFieldFormCreate({
  specialties,
  isPending,
  globalError,
  onSubmit,
}: CanonicalFieldFormCreateProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { options: [] },
  })

  const selectedType = watch('type')
  const isSelect = selectedType && SELECT_TYPES.includes(selectedType as MedicalRecordFieldType)

  function handleFormSubmit(data: CreateFormValues) {
    const input: ICreateCanonicalFieldInput = {
      canonicalKey: data.canonicalKey,
      label: data.label,
      type: data.type,
      ...(isSelect && data.options?.length ? { options: data.options } : {}),
      ...(data.unit ? { unit: data.unit } : {}),
      ...(data.specialtyId ? { specialtyId: data.specialtyId } : {}),
      ...(data.description ? { description: data.description } : {}),
    }
    onSubmit(input, setError as any)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="canonical-field-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="canonical-field-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Chave canônica"
          id="canonicalKey"
          placeholder="ex: blood_pressure"
          error={getMsg(errors.canonicalKey)}
          data-testid="canonical-field-form-canonical-key"
          {...register('canonicalKey')}
        />

        <Input
          label="Rótulo"
          id="label"
          placeholder="ex: Pressão arterial"
          error={getMsg(errors.label)}
          data-testid="canonical-field-form-label"
          {...register('label')}
        />

        <SelectField
          label="Tipo"
          id="type"
          error={getMsg(errors.type)}
          testId="canonical-field-form-type"
          registerProps={register('type')}
        >
          <option value="">Selecione um tipo</option>
          {Object.values(MedicalRecordFieldType).map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>

        {isSelect && (
          <CanonicalFieldOptionsEditor control={control} errors={errors} />
        )}

        <SelectField
          label="Especialidade"
          id="specialtyId"
          error={undefined}
          testId="canonical-field-form-specialty"
          registerProps={register('specialtyId')}
          optional
        >
          <option value="">Geral (todas as especialidades)</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>

        <Input
          label="Unidade"
          id="unit"
          placeholder="ex: mmHg, kg, %"
          error={getMsg(errors.unit)}
          data-testid="canonical-field-form-unit"
          {...register('unit')}
        />

        <TextAreaField
          label="Descrição"
          id="description"
          testId="canonical-field-form-description"
          error={getMsg(errors.description)}
          registerProps={register('description')}
          optional
        />

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="canonical-field-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar campo'}
        </Button>
      </div>
    </form>
  )
}

function CanonicalFieldFormEdit({
  defaultValues,
  specialties,
  isPending,
  globalError,
  onSubmit,
}: CanonicalFieldFormEditProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: { options: [] },
  })

  useEffect(() => {
    reset({
      label: defaultValues.label,
      type: defaultValues.type,
      unit: defaultValues.unit ?? '',
      specialtyId: defaultValues.specialtyId ?? '',
      description: defaultValues.description ?? '',
      options: defaultValues.options ?? [],
    })
  }, [defaultValues, reset])

  const selectedType = watch('type')
  const isSelect = selectedType && SELECT_TYPES.includes(selectedType as MedicalRecordFieldType)

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdateCanonicalFieldInput = {
      label: data.label,
      type: data.type,
      ...(isSelect && data.options?.length ? { options: data.options } : {}),
      unit: data.unit || undefined,
      specialtyId: data.specialtyId || undefined,
      description: data.description || undefined,
    }
    onSubmit(input, setError as any)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="canonical-field-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="canonical-field-form-error">
            {globalError}
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Chave canônica</label>
          <p
            className="px-3 py-2 rounded-md border border-line bg-surface-2 text-sm font-mono text-text-dim"
            data-testid="canonical-field-form-canonical-key-readonly"
          >
            {defaultValues.canonicalKey}
          </p>
        </div>

        <Input
          label="Rótulo"
          id="label"
          error={getMsg(errors.label)}
          data-testid="canonical-field-form-label"
          {...register('label')}
        />

        <SelectField
          label="Tipo"
          id="type"
          error={getMsg(errors.type)}
          testId="canonical-field-form-type"
          registerProps={register('type')}
        >
          <option value="">Selecione um tipo</option>
          {Object.values(MedicalRecordFieldType).map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>

        {isSelect && (
          <CanonicalFieldOptionsEditor control={control} errors={errors} />
        )}

        <SelectField
          label="Especialidade"
          id="specialtyId"
          error={undefined}
          testId="canonical-field-form-specialty"
          registerProps={register('specialtyId')}
          optional
        >
          <option value="">Geral (todas as especialidades)</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>

        <Input
          label="Unidade"
          id="unit"
          placeholder="ex: mmHg, kg, %"
          error={getMsg(errors.unit)}
          data-testid="canonical-field-form-unit"
          {...register('unit')}
        />

        <TextAreaField
          label="Descrição"
          id="description"
          testId="canonical-field-form-description"
          error={getMsg(errors.description)}
          registerProps={register('description')}
          optional
        />

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="canonical-field-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function SelectField({
  label,
  id,
  testId,
  error,
  registerProps,
  optional,
  children,
}: {
  label: string
  id: string
  testId: string
  error?: string
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {optional && <span className="ml-1 text-xs text-text-mute">(opcional)</span>}
      </label>
      <select
        id={id}
        aria-invalid={!!error}
        className={cn(
          'w-full rounded-md px-3 py-2 text-base',
          'bg-surface border border-line text-text',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
        )}
        data-testid={testId}
        {...registerProps}
      >
        {children}
      </select>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}

function TextAreaField({
  label,
  id,
  testId,
  error,
  registerProps,
  optional,
}: {
  label: string
  id: string
  testId: string
  error?: string
  registerProps: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }
  optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {optional && <span className="ml-1 text-xs text-text-mute">(opcional)</span>}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'w-full rounded-md px-3 py-2 text-base',
          'bg-surface border border-line text-text',
          'resize-none transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
        )}
        data-testid={testId}
        {...registerProps}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
