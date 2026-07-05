'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useThemes } from '@/components/features/themes/hooks/use-themes.hook'
import type { ICreateClinicInput, IUpdateClinicInput, IClinicModel } from '../types/clinic.types'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const zipCodeRegex = /^\d{5}-\d{3}$/

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const addressSchema = z.object({
  street: z.string().min(1, 'Logradouro obrigatório').max(255),
  number: z.string().min(1, 'Número obrigatório').max(20),
  complement: z.string().max(100).optional().or(z.literal('')),
  neighborhood: z.string().min(1, 'Bairro obrigatório').max(100),
  city: z.string().min(1, 'Cidade obrigatória').max(100),
  state: z.string().length(2, 'UF deve ter 2 caracteres').toUpperCase(),
  zipCode: z.string().regex(zipCodeRegex, 'CEP inválido. Use o formato 00000-000'),
  country: z.string().length(2).optional(),
})

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
  themeId: z.string().uuid().nullish(),
  address: addressSchema,
})

const updateSchema = z.object({
  name: nameField.optional().or(z.literal('')),
  slug: slugField.optional().or(z.literal('')),
  isActive: z.boolean(),
  themeId: z.string().uuid().nullish(),
  address: addressSchema.optional(),
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
    setValue,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      slug: '',
      themeId: null,
      address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'BR' },
    },
  })

  const nameValue = watch('name')
  const slugValue = watch('slug')
  const themeId = watch('themeId')
  const slugPreview = slugValue ? slugValue : generateSlug(nameValue || '')

  function handleFormSubmit(data: CreateFormValues) {
    onSubmit(
      {
        name: data.name,
        slug: data.slug || undefined,
        themeId: data.themeId ?? null,
        address: {
          street: data.address.street,
          number: data.address.number,
          complement: data.address.complement || null,
          neighborhood: data.address.neighborhood,
          city: data.address.city,
          state: data.address.state.toUpperCase(),
          zipCode: data.address.zipCode,
          country: /* c8 ignore next */ data.address.country || 'BR',
        },
      },
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

        <ThemeSelector
          value={themeId}
          onChange={(id) => setValue('themeId', id)}
        />

        <AddressFields register={register} errors={errors.address} prefix="address" />

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
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: defaultValues.name,
      slug: defaultValues.slug,
      isActive: defaultValues.isActive,
      themeId: defaultValues.themeId,
      address: defaultValues.address
        ? {
            street: defaultValues.address.street,
            number: defaultValues.address.number,
            complement: defaultValues.address.complement ?? '',
            neighborhood: defaultValues.address.neighborhood,
            city: defaultValues.address.city,
            state: defaultValues.address.state,
            zipCode: defaultValues.address.zipCode,
            country: defaultValues.address.country,
          }
        : undefined,
    },
  })

  useEffect(() => {
    reset({
      name: defaultValues.name,
      slug: defaultValues.slug,
      isActive: defaultValues.isActive,
      themeId: defaultValues.themeId,
      address: defaultValues.address
        ? {
            street: defaultValues.address.street,
            number: defaultValues.address.number,
            complement: defaultValues.address.complement ?? '',
            neighborhood: defaultValues.address.neighborhood,
            city: defaultValues.address.city,
            state: defaultValues.address.state,
            zipCode: defaultValues.address.zipCode,
            country: defaultValues.address.country,
          }
        : undefined,
    })
  }, [defaultValues, reset])

  const themeId = watch('themeId')

  function handleFormSubmit(data: UpdateFormValues) {
    let address: IUpdateClinicInput['address']
    /* istanbul ignore else */
    if (data.address) {
      address = {
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement || null,
        neighborhood: data.address.neighborhood,
        city: data.address.city,
        state: data.address.state.toUpperCase(),
        zipCode: data.address.zipCode,
        country: /* c8 ignore next */ data.address.country || 'BR',
      }
    }
    onSubmit(
      { name: data.name || undefined, slug: data.slug || undefined, isActive: data.isActive, themeId: data.themeId ?? null, address },
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

        <ThemeSelector
          value={themeId}
          onChange={(id) => setValue('themeId', id)}
        />

        <AddressFields register={register} errors={errors.address} prefix="address" />

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

interface ThemeSelectorProps {
  value?: string | null
  onChange: (id: string | null) => void
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const { data: themesData, isPending } = useThemes(1, 50)
  const themes = themesData?.data ?? []

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text">Tema</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="clinic-form-theme-loading">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" data-testid="clinic-form-theme-selector">
      <span className="text-sm font-medium text-text">Tema</span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          data-testid="clinic-form-theme-none"
          onClick={() => onChange(null)}
          className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
            !value
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-surface text-text-mute hover:border-accent'
          }`}
        >
          <span className="h-5 w-5 flex-shrink-0 rounded-full border border-line bg-bg" aria-hidden="true" />
          <span>Padrão da plataforma</span>
        </button>
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            data-testid={`clinic-form-theme-option-${theme.id}`}
            onClick={() => onChange(theme.id)}
            className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
              value === theme.id
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-surface text-text-mute hover:border-accent'
            }`}
          >
            <span
              className="h-5 w-5 flex-shrink-0 rounded-full border border-line"
              style={{ background: theme.accentColor }}
              aria-hidden="true"
            />
            <span className="truncate">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface AddressFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: (name: any, options?: any) => any
  errors: any
  prefix: string
}

function AddressFields({ register, errors, prefix }: AddressFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-3 rounded border border-line p-4">
      <legend className="px-1 text-sm font-medium text-text">Endereço</legend>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Logradouro"
            id={`${prefix}.street`}
            placeholder="Rua das Flores"
            data-testid="clinic-form-address-street"
            error={errors?.street?.message}
            {...register(`${prefix}.street`)}
          />
        </div>
        <div className="w-28">
          <Input
            label="Número"
            id={`${prefix}.number`}
            placeholder="123"
            data-testid="clinic-form-address-number"
            error={errors?.number?.message}
            {...register(`${prefix}.number`)}
          />
        </div>
      </div>

      <Input
        label="Complemento"
        id={`${prefix}.complement`}
        placeholder="Apto 42 (opcional)"
        data-testid="clinic-form-address-complement"
        error={errors?.complement?.message}
        {...register(`${prefix}.complement`)}
      />

      <Input
        label="Bairro"
        id={`${prefix}.neighborhood`}
        placeholder="Centro"
        data-testid="clinic-form-address-neighborhood"
        error={errors?.neighborhood?.message}
        {...register(`${prefix}.neighborhood`)}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Cidade"
            id={`${prefix}.city`}
            placeholder="São Paulo"
            data-testid="clinic-form-address-city"
            error={errors?.city?.message}
            {...register(`${prefix}.city`)}
          />
        </div>
        <div className="w-20">
          <Input
            label="UF"
            id={`${prefix}.state`}
            placeholder="SP"
            maxLength={2}
            data-testid="clinic-form-address-state"
            error={errors?.state?.message}
            {...register(`${prefix}.state`)}
          />
        </div>
      </div>

      <Input
        label="CEP"
        id={`${prefix}.zipCode`}
        placeholder="00000-000"
        data-testid="clinic-form-address-zipcode"
        error={errors?.zipCode?.message}
        {...register(`${prefix}.zipCode`)}
      />
    </fieldset>
  )
}
