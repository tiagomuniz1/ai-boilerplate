'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import type { ICreateClinicInput, IUpdateClinicInput, IClinicModel } from '../types/clinic.types'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const nameField = z
  .string()
  .min(3, 'Nome deve ter ao menos 3 caracteres')
  .max(120, 'Nome deve ter no máximo 120 caracteres')

const slugField = z
  .string()
  .regex(slugRegex, 'Slug inválido. Use letras minúsculas, números e hífens (ex: minha-clinica)')
  .min(3, 'Slug deve ter ao menos 3 caracteres')
  .max(80, 'Slug deve ter no máximo 80 caracteres')

const createSchema = z.object({
  name: nameField,
  slug: slugField.optional().or(z.literal('')),
})

const updateSchema = z.object({
  name: nameField.optional().or(z.literal('')),
  slug: slugField.optional().or(z.literal('')),
  isActive: z.boolean(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

interface ClinicFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateClinicInput,
    setError: (field: keyof ICreateClinicInput, error: { message: string }) => void,
  ) => void
}

interface ClinicFormEditProps {
  mode: 'edit'
  defaultValues: IClinicModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateClinicInput,
    setError: (field: keyof IUpdateClinicInput, error: { message: string }) => void,
  ) => void
}

type ClinicFormProps = ClinicFormCreateProps | ClinicFormEditProps

export function ClinicForm(props: ClinicFormProps) {
  if (props.mode === 'create') {
    return <ClinicFormCreate {...props} />
  }
  return <ClinicFormEdit {...props} />
}

function ClinicFormCreate({ isPending, globalError, onSubmit }: ClinicFormCreateProps) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', slug: '' },
  })

  const nameValue = watch('name')
  const slugValue = watch('slug')
  const slugPreview = slugValue ? slugValue : generateSlug(nameValue || '')

  function handleFormSubmit(data: CreateFormValues) {
    onSubmit(
      { name: data.name, slug: data.slug || undefined },
      setError as (field: keyof ICreateClinicInput, error: { message: string }) => void,
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="clinic-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="clinic-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Nome"
          id="name"
          placeholder="Clínica do Coração"
          data-testid="clinic-form-name"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Slug"
            id="slug"
            placeholder="clinica-do-coracao"
            data-testid="clinic-form-slug"
            error={errors.slug?.message}
            {...register('slug')}
          />
          {slugPreview && (
            <p className="text-xs text-text-mute" data-testid="clinic-form-slug-preview">
              Preview: <span className="font-mono">{slugPreview}</span>
            </p>
          )}
        </div>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="clinic-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar clínica'}
        </Button>
      </div>
    </form>
  )
}

function ClinicFormEdit({ defaultValues, isPending, globalError, onSubmit }: ClinicFormEditProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: defaultValues.name,
      slug: defaultValues.slug,
      isActive: defaultValues.isActive,
    },
  })

  useEffect(() => {
    reset({
      name: defaultValues.name,
      slug: defaultValues.slug,
      isActive: defaultValues.isActive,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    onSubmit(
      {
        name: data.name || undefined,
        slug: data.slug || undefined,
        isActive: data.isActive,
      },
      setError as (field: keyof IUpdateClinicInput, error: { message: string }) => void,
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="clinic-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="clinic-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Nome"
          id="name"
          placeholder="Clínica do Coração"
          data-testid="clinic-form-name"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Slug"
          id="slug"
          placeholder="clinica-do-coracao"
          data-testid="clinic-form-slug"
          error={errors.slug?.message}
          {...register('slug')}
        />

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            data-testid="clinic-form-isactive"
            className="h-4 w-4 rounded border-line accent-accent"
            {...register('isActive')}
          />
          <span className="text-sm text-text">Clínica ativa</span>
        </label>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="clinic-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
