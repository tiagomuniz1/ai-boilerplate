'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller, useController, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { KinshipType, KINSHIP_TYPE_LABELS, PatientGender } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import { applyPhoneMask, formatPhone } from '@/lib/format-phone'
import { applyCpfMask, formatCpf } from '@/lib/format-cpf'
import { userService } from '@/components/features/users/services/users.service'
import { TitularSearch } from './titular-search'
import type { ICreatePatientInput, IUpdatePatientInput } from '../types/patient-input.types'
import type { IPatientModel } from '../types/patient-model.types'

const KINSHIP_TYPES = Object.values(KinshipType)

const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/
const documentNumberRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/

const dependentFields = {
  isDependent: z.boolean(),
  responsiblePatientId: z.string().optional(),
  kinshipType: z.string().optional(),
}

function validateDependentFields(
  data: { isDependent: boolean; documentNumber?: string; responsiblePatientId?: string; kinshipType?: string },
  ctx: z.RefinementCtx,
) {
  if (data.isDependent) {
    if (!data.responsiblePatientId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['responsiblePatientId'], message: 'Selecione o paciente titular' })
    }
    if (!data.kinshipType || !(Object.values(KinshipType) as string[]).includes(data.kinshipType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['kinshipType'], message: 'Selecione o grau de parentesco' })
    }
  } else if (!data.documentNumber || !documentNumberRegex.test(data.documentNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentNumber'], message: 'Documento deve ter 11 dígitos numéricos' })
  }
}

const patientRequiredFields = {
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
  documentNumber: z.string().optional(),
  // z.nativeEnum aborts fatally when invalid, preventing superRefine from running; use z.string().refine
  gender: z.string().refine(
    (val) => (Object.values(PatientGender) as string[]).includes(val),
    { message: 'Selecione um gênero válido' },
  ),
  ...dependentFields,
}

const baseFields = {
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  ...patientRequiredFields,
  gender: z.nativeEnum(PatientGender, {
    errorMap: () => ({ message: 'Selecione um gênero válido' }),
  }),
}

const createSchema = z
  .discriminatedUnion('userMode', [
    z.object({
      userMode: z.literal('new'),
      fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
      email: z.string().email('E-mail inválido'),
      ...patientRequiredFields,
    }),
    z.object({
      userMode: z.literal('existing'),
      userId: z.string({ required_error: 'Selecione um usuário' }).min(1, 'Selecione um usuário'),
      ...patientRequiredFields,
    }),
  ])
  .superRefine(validateDependentFields)

const updateSchema = z
  .object({
    fullName: baseFields.fullName.optional().or(z.literal('')),
    email: baseFields.email.optional().or(z.literal('')),
    phoneNumber: baseFields.phoneNumber.optional().or(z.literal('')),
    birthDate: baseFields.birthDate.optional().or(z.literal('')),
    documentNumber: z.string().optional(),
    gender: baseFields.gender.optional(),
    ...dependentFields,
  })
  .superRefine(validateDependentFields)

type CreateFormValues = {
  userMode: 'existing' | 'new'
  userId?: string
  fullName?: string
  email?: string
  phoneNumber: string
  birthDate: string
  documentNumber?: string
  gender: string
  isDependent: boolean
  responsiblePatientId?: string
  kinshipType?: string
}
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
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      userMode: 'new',
      userId: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      birthDate: '',
      gender: '',
      isDependent: false,
    },
  })

  const { field: userModeField } = useController({ name: 'userMode', control })
  const { field: isDependentField } = useController({ name: 'isDependent', control })
  const userMode = watch('userMode', 'new')
  const isDependent = watch('isDependent', false)

  function handleFormSubmit(data: CreateFormValues) {
    const shared = {
      documentNumber: data.isDependent ? undefined : data.documentNumber?.replace(/\D/g, ''),
      phoneNumber: data.phoneNumber,
      birthDate: data.birthDate,
      gender: data.gender as PatientGender,
      responsiblePatientId: data.isDependent ? data.responsiblePatientId : undefined,
      kinshipType: data.isDependent ? (data.kinshipType as KinshipType) : undefined,
    }
    const input: ICreatePatientInput =
      data.userMode === 'existing'
        ? { userId: data.userId, ...shared }
        : { fullName: data.fullName, email: data.email, ...shared }

    onSubmit(input, setError as (field: keyof ICreatePatientInput, error: { message: string }) => void)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="patient-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="patient-form-error">
            {globalError}
          </Alert>
        )}

        <div className="flex gap-4" data-testid="patient-form-user-mode">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="new"
              checked={userModeField.value === 'new'}
              onChange={() => userModeField.onChange('new')}
              data-testid="patient-form-user-mode-new"
            />
            <span className="text-sm">Novo usuário</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="existing"
              checked={userModeField.value === 'existing'}
              onChange={() => userModeField.onChange('existing')}
              data-testid="patient-form-user-mode-existing"
            />
            <span className="text-sm">Usuário existente</span>
          </label>
        </div>

        {userMode === 'existing' ? (
          <UserSearch control={control} error={errors.userId?.message} />
        ) : (
          <>
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
          </>
        )}

        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={applyPhoneMask(field.value)}
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

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDependentField.value}
            onChange={(e) => isDependentField.onChange(e.target.checked)}
            data-testid="patient-form-is-dependent"
          />
          <span className="text-sm">Este paciente é dependente de outro paciente (titular)</span>
        </label>

        {isDependent ? (
          <>
            <TitularSearch control={control} name="responsiblePatientId" error={errors.responsiblePatientId?.message} />
            <KinshipSelect registerProps={register('kinshipType')} error={errors.kinshipType?.message} />
          </>
        ) : (
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
        )}

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

function UserSearch({ control, error }: { control: Control<CreateFormValues>; error?: string }) {
  const [inputValue, setInputValue] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { field } = useController({ name: 'userId', control })

  const { data: searchResponse, isFetching } = useQuery({
    queryKey: ['users-search', debouncedTerm],
    queryFn: () => userService.getAll({ search: debouncedTerm, limit: 10 }),
    enabled: debouncedTerm.length >= 2,
  })
  const searchResults = searchResponse?.data ?? []

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(true)
    if (field.value) field.onChange('')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => setDebouncedTerm(value), 300)
  }

  function handleSelect(user: { id: string; fullName: string; email: string }) {
    field.onChange(user.id)
    setInputValue(`${user.fullName} (${user.email})`)
    setIsOpen(false)
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const showDropdown = isOpen && debouncedTerm.length >= 2

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor="user-search" className="text-sm font-medium text-text">
        Usuário
      </label>
      <input
        id="user-search"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => { if (debouncedTerm.length >= 2) setIsOpen(true) }}
        placeholder="Buscar por nome ou e-mail..."
        autoComplete="off"
        aria-invalid={!!error}
        data-testid="patient-form-user-search"
        className={cn(
          'h-10 w-full rounded-md px-3 text-base',
          'bg-surface border border-line',
          'text-text placeholder:text-text/50',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
        )}
      />
      {showDropdown && (
        <ul
          className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-line bg-surface shadow-md"
          data-testid="patient-form-user-search-results"
        >
          {isFetching ? (
            <li className="px-3 py-2 text-sm text-text/60">Buscando...</li>
          ) : searchResults.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text/60">Nenhum usuário encontrado</li>
          ) : (
            searchResults.map((u) => (
              <li
                key={u.id}
                role="option"
                aria-selected={field.value === u.id}
                data-testid="patient-form-user-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(u)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent/10"
              >
                {u.fullName} ({u.email})
              </li>
            ))
          )}
        </ul>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}

function PatientFormEdit({ defaultValues, isPending, globalError, onSubmit }: PatientFormEditProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
  })

  const { field: isDependentField } = useController({ name: 'isDependent', control })
  const isDependent = watch('isDependent', false)

  useEffect(() => {
    reset({
      fullName: defaultValues.fullName,
      email: defaultValues.email,
      phoneNumber: formatPhone(defaultValues.phoneNumber),
      birthDate: defaultValues.birthDate.toISOString().split('T')[0],
      documentNumber: formatCpf(defaultValues.documentNumber),
      gender: defaultValues.gender,
      isDependent: !!defaultValues.responsiblePatientId,
      responsiblePatientId: defaultValues.responsiblePatientId ?? undefined,
      kinshipType: defaultValues.kinshipType ?? undefined,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdatePatientInput = {
      fullName: data.fullName || undefined,
      email: data.email || undefined,
      phoneNumber: data.phoneNumber || undefined,
      birthDate: data.birthDate || undefined,
      gender: data.gender,
      documentNumber: data.documentNumber ? data.documentNumber.replace(/\D/g, '') : undefined,
    }

    if (data.isDependent) {
      input.responsiblePatientId = data.responsiblePatientId
      input.kinshipType = data.kinshipType as KinshipType
    } else if (defaultValues.responsiblePatientId) {
      input.responsiblePatientId = null
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

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDependentField.value}
            onChange={(e) => isDependentField.onChange(e.target.checked)}
            data-testid="patient-form-is-dependent"
          />
          <span className="text-sm">Este paciente é dependente de outro paciente (titular)</span>
        </label>

        {isDependent && (
          <>
            <TitularSearch
              control={control}
              name="responsiblePatientId"
              currentPatientId={defaultValues.id}
              initialLabel={
                defaultValues.responsiblePatient
                  ? `${defaultValues.responsiblePatient.fullName} (${formatCpf(defaultValues.responsiblePatient.documentNumber)})`
                  : undefined
              }
              error={errors.responsiblePatientId?.message}
            />
            <KinshipSelect registerProps={register('kinshipType')} error={errors.kinshipType?.message} />
          </>
        )}

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

function KinshipSelect({
  registerProps,
  error,
}: {
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  error?: string
}) {
  const selectId = 'kinshipType'
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-text">
        Grau de parentesco
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
        data-testid="patient-form-kinship-type"
        {...registerProps}
      >
        <option value="">Selecione...</option>
        {KINSHIP_TYPES.map((kinshipType) => (
          <option key={kinshipType} value={kinshipType}>
            {KINSHIP_TYPE_LABELS[kinshipType]}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${selectId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
