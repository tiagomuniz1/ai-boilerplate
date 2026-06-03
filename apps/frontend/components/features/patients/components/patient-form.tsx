'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PatientGender } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import { applyPhoneMask, formatPhone } from '@/lib/format-phone'
import { applyCpfMask, formatCpf } from '@/lib/format-cpf'
import type { ICreatePatientInput, IUpdatePatientInput } from '../types/patient-input.types'
import type { IPatientModel } from '../types/patient-model.types'

const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/
const documentNumberRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/

const baseFields = {
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phoneNumber: z.string().regex(phoneRegex, 'Telefone inválido. Ex: (11) 99999-9999'),
  birthDate: z
    .string()
    .min(1, 'Data de nascimento obrigatória')
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime()) && date < new Date()
      },
      { message: 'Data de nascimento não pode ser futura' },
    ),
  documentNumber: z
    .string()
    .regex(documentNumberRegex, 'Documento deve ter 11 dígitos numéricos'),
  gender: z.nativeEnum(PatientGender, {
    errorMap: () => ({ message: 'Selecione um gênero válido' }),
  }),
}

const createSchema = z.object(baseFields)

const updateSchema = z.object({
  fullName: baseFields.fullName.optional().or(z.literal('')),
  email: baseFields.email.optional().or(z.literal('')),
  phoneNumber: baseFields.phoneNumber.optional().or(z.literal('')),
  birthDate: baseFields.birthDate.optional().or(z.literal('')),
  documentNumber: baseFields.documentNumber.optional().or(z.literal('')),
  gender: baseFields.gender.optional(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

interface PatientFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreatePatientInput,
    setError: (field: keyof ICreatePatientInput, error: { message: string }) => void,
  ) => void
}

interface PatientFormEditProps {
  mode: 'edit'
  defaultValues: IPatientModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdatePatientInput,
    setError: (field: keyof IUpdatePatientInput, error: { message: string }) => void,
  ) => void
}

type PatientFormProps = PatientFormCreateProps | PatientFormEditProps

export function PatientForm(props: PatientFormProps) {
  if (props.mode === 'create') {
    return <PatientFormCreate {...props} />
  }
  return <PatientFormEdit {...props} />
}

function PatientFormCreate({ isPending, globalError, onSubmit }: PatientFormCreateProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
  })

  function handleFormSubmit(data: CreateFormValues) {
    onSubmit(
      {
        ...data,
        phoneNumber: data.phoneNumber.replace(/\D/g, ''),
        documentNumber: data.documentNumber.replace(/\D/g, ''),
      },
      setError as (field: keyof ICreatePatientInput, error: { message: string }) => void,
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="patient-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="patient-form-error">
            {globalError}
          </Alert>
        )}
        <Input
          label="Nome completo"
          id="fullName"
          data-testid="patient-form-fullname"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="E-mail"
          id="email"
          type="email"
          data-testid="patient-form-email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={applyPhoneMask(field.value ?? '')}
              onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
              label="Telefone"
              id="phoneNumber"
              type="tel"
              placeholder="(11) 99999-9999"
              data-testid="patient-form-phone"
              error={errors.phoneNumber?.message}
            />
          )}
        />
        <Input
          label="Data de nascimento"
          id="birthDate"
          type="date"
          data-testid="patient-form-birthdate"
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <Controller
          name="documentNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={applyCpfMask(field.value ?? '')}
              onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
              label="Número do documento (CPF)"
              id="documentNumber"
              placeholder="000.000.000-00"
              data-testid="patient-form-document"
              error={errors.documentNumber?.message}
            />
          )}
        />
        <GenderSelect registerProps={register('gender')} error={errors.gender?.message} />
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="patient-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar paciente'}
        </Button>
      </div>
    </form>
  )
}

function PatientFormEdit({ defaultValues, isPending, globalError, onSubmit }: PatientFormEditProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
  })

  useEffect(() => {
    reset({
      fullName: defaultValues.fullName,
      email: defaultValues.email,
      phoneNumber: formatPhone(defaultValues.phoneNumber),
      birthDate: defaultValues.birthDate.toISOString().split('T')[0],
      documentNumber: formatCpf(defaultValues.documentNumber),
      gender: defaultValues.gender,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const rawPhone = data.phoneNumber?.replace(/\D/g, '') || undefined
    const input: IUpdatePatientInput = {
      fullName: data.fullName || undefined,
      email: data.email || undefined,
      phoneNumber: rawPhone,
      birthDate: data.birthDate || undefined,
      gender: data.gender,
    }
    onSubmit(input, setError as (field: keyof IUpdatePatientInput, error: { message: string }) => void)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="patient-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="patient-form-error">
            {globalError}
          </Alert>
        )}
        <Input
          label="Nome completo"
          id="fullName"
          data-testid="patient-form-fullname"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="E-mail"
          id="email"
          type="email"
          data-testid="patient-form-email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={applyPhoneMask(field.value ?? '')}
              onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
              label="Telefone"
              id="phoneNumber"
              type="tel"
              placeholder="(11) 99999-9999"
              data-testid="patient-form-phone"
              error={errors.phoneNumber?.message}
            />
          )}
        />
        <Input
          label="Data de nascimento"
          id="birthDate"
          type="date"
          data-testid="patient-form-birthdate"
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <Controller
          name="documentNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={applyCpfMask(field.value ?? '')}
              onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
              label="Número do documento (CPF)"
              id="documentNumber"
              placeholder="000.000.000-00"
              data-testid="patient-form-document"
              error={errors.documentNumber?.message}
            />
          )}
        />
        <GenderSelect registerProps={register('gender')} error={errors.gender?.message} />
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="patient-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function GenderSelect({
  registerProps,
  error,
}: {
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  error?: string
}) {
  const selectId = 'gender'
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-text">
        Gênero
      </label>
      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn(
          'h-10 w-full rounded-md px-3 text-base',
          'bg-surface border border-line',
          'text-text',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
        )}
        data-testid="patient-form-gender"
        {...registerProps}
      >
        <option value="">Selecione...</option>
        <option value={PatientGender.MALE}>Masculino</option>
        <option value={PatientGender.FEMALE}>Feminino</option>
        <option value={PatientGender.OTHER}>Outro</option>
      </select>
      {error && (
        <span id={`${selectId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
