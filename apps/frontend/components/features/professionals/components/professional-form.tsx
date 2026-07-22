'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, useController, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import { CouncilType, COUNCIL_REGISTRATION_FORMATS, COUNCIL_TYPE_LABELS, UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { userService } from '@/components/features/users/services/users.service'
import { clinicSpecialtiesService } from '@/components/features/clinic-specialties/services/clinic-specialties.service'
import type { ICreateProfessionalInput, IProfessionalRegistrationInput, IUpdateProfessionalInput } from '../types/professional-input.types'
import type { IProfessionalModel } from '../types/professional-model.types'

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const COUNCIL_TYPES = Object.values(CouncilType)

// Permissive keystroke filter shared by every council format (digits, uppercase letters, "/" and "-").
// The exact shape per councilType is enforced by COUNCIL_REGISTRATION_FORMATS[...].numberPattern at submit.
function filterRegistrationNumber(raw: string, councilType: CouncilType): string {
  const format = COUNCIL_REGISTRATION_FORMATS[councilType]
  const sanitized = raw.toUpperCase().replace(/[^0-9A-Z/-]/g, '')
  return sanitized.slice(0, format.numberMaxLength)
}

const registrationsField = z
  .array(
    z.object({
      councilType: z.nativeEnum(CouncilType),
      number: z.string(),
      state: z.string(),
      isPrimary: z.boolean(),
    }),
  )
  .min(1, 'Informe ao menos um registro profissional')
  .refine(
    (registrations) =>
      registrations.every(
        (registration) =>
          COUNCIL_REGISTRATION_FORMATS[registration.councilType].numberPattern.test(registration.number) &&
          /^[A-Z]{2}$/.test(registration.state),
      ),
    'Preencha número e UF de todos os registros no formato esperado',
  )

const specialtiesField = z
  .array(
    z.object({
      specialtyId: z.string().uuid(),
      registryNumber: z
        .string()
        .regex(/^\d{1,10}$/, 'RQE deve conter apenas dígitos')
        .optional()
        .or(z.literal('')),
    }),
  )

const bioField = z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional()

const createSchema = z
  .object({
    userMode: z.enum(['existing', 'new']),
    userId: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    registrations: registrationsField,
    specialties: specialtiesField,
    bio: bioField,
  })
  .superRefine((data, ctx) => {
    if (data.userMode === 'existing' && !data.userId) {
      ctx.addIssue({ code: 'custom', path: ['userId'], message: 'Selecione um usuário' })
    }
    if (data.userMode === 'new') {
      if (!data.fullName || data.fullName.trim().length < 3) {
        ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Nome deve ter no mínimo 3 caracteres' })
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'E-mail inválido' })
      }
    }
  })

const updateSchema = z.object({
  registrations: registrationsField,
  specialties: specialtiesField,
  bio: bioField,
  isActive: z.boolean(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

type SpecialtyValue = { specialtyId: string; registryNumber?: string }

function fieldArrayError(error: unknown): string | undefined {
  const err = error as { message?: string; root?: { message?: string } } | undefined
  return err?.message ?? err?.root?.message
}

function toProfessionalSpecialtiesInput(specialties: SpecialtyValue[]) {
  return specialties.map((specialty) => ({
    specialtyId: specialty.specialtyId,
    registryNumber: specialty.registryNumber ? specialty.registryNumber : undefined,
  }))
}

// RQE is exclusive to CRM — the specialty group only collects it when the professional's
// primary registration is CRM, regardless of any other registrations they may also hold.
function showsRegistryNumber(registrations: IProfessionalRegistrationInput[]): boolean {
  return registrations.find((registration) => registration.isPrimary)?.councilType === CouncilType.CRM
}

interface ProfessionalFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateProfessionalInput,
    setError: (field: keyof ICreateProfessionalInput, error: { message: string }) => void,
  ) => void
}

interface ProfessionalFormEditProps {
  mode: 'edit'
  defaultValues: IProfessionalModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateProfessionalInput,
    setError: (field: keyof IUpdateProfessionalInput, error: { message: string }) => void,
  ) => void
}

type ProfessionalFormProps = ProfessionalFormCreateProps | ProfessionalFormEditProps

export function ProfessionalForm(props: ProfessionalFormProps) {
  if (props.mode === 'create') {
    return <ProfessionalFormCreate {...props} />
  }
  return <ProfessionalFormEdit {...props} />
}

function ProfessionalFormCreate({ isPending, globalError, onSubmit }: ProfessionalFormCreateProps) {
  const authUser = useAuthStore((state) => state.user)
  /* c8 ignore next */
  const clinicId = authUser?.clinicId ?? ''

  const {
    register,
    handleSubmit,
    setError,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      userMode: 'existing',
      registrations: [{ councilType: CouncilType.CRM, number: '', state: '', isPrimary: true }],
      specialties: [],
    },
  })

  const { field: registrationsFieldCtl } = useController({ name: 'registrations', control })
  const { field: specialtyField } = useController({ name: 'specialties', control })
  const { field: userModeField } = useController({ name: 'userMode', control })

  const userMode = watch('userMode')

  const { data: clinicSpecialtiesResponse, isPending: isLoadingSpecialties } = useQuery({
    queryKey: ['clinic-specialties-for-select', clinicId],
    queryFn: () => clinicSpecialtiesService.getAll(clinicId, { limit: 100 }),
    enabled: !!clinicId,
  })

  const specialties = (clinicSpecialtiesResponse?.data ?? []).map((s) => ({
    id: s.specialtyId,
    name: s.name,
  }))

  const isMedicalProfessional = showsRegistryNumber(registrationsFieldCtl.value as IProfessionalRegistrationInput[])

  function handleRegistrationsChange(next: IProfessionalRegistrationInput[]) {
    const wasCrm = showsRegistryNumber(registrationsFieldCtl.value as IProfessionalRegistrationInput[])
    registrationsFieldCtl.onChange(next)
    if (wasCrm && !showsRegistryNumber(next)) {
      specialtyField.onChange([])
    }
  }

  function handleFormSubmit(data: CreateFormValues) {
    const input: ICreateProfessionalInput =
      data.userMode === 'existing'
        ? {
            userId: data.userId,
            registrations: data.registrations,
            specialties: toProfessionalSpecialtiesInput(data.specialties),
            bio: data.bio || undefined,
          }
        : {
            fullName: data.fullName,
            email: data.email,
            registrations: data.registrations,
            specialties: toProfessionalSpecialtiesInput(data.specialties),
            bio: data.bio || undefined,
          }
    onSubmit(input, setError as (field: keyof ICreateProfessionalInput, error: { message: string }) => void)
  }

  function toggleSpecialty(id: string) {
    const current = specialtyField.value as SpecialtyValue[]
    if (current.some((s) => s.specialtyId === id)) {
      specialtyField.onChange(current.filter((s) => s.specialtyId !== id))
    } else {
      specialtyField.onChange([...current, { specialtyId: id, registryNumber: '' }])
    }
  }

  function changeRqe(id: string, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    const current = specialtyField.value as SpecialtyValue[]
    specialtyField.onChange(current.map((s) => (s.specialtyId === id ? { ...s, registryNumber: digits } : s)))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="professional-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="professional-form-error">
            {globalError}
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Usuário</span>
          <div className="flex gap-4" data-testid="professional-form-user-mode">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                value="existing"
                data-testid="professional-form-user-mode-existing"
                checked={userModeField.value === 'existing'}
                onChange={() => userModeField.onChange('existing')}
                className="accent-accent"
              />
              Usuário existente
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                value="new"
                data-testid="professional-form-user-mode-new"
                checked={userModeField.value === 'new'}
                onChange={() => userModeField.onChange('new')}
                className="accent-accent"
              />
              Novo usuário
            </label>
          </div>
        </div>

        {userMode === 'existing' ? (
          <UserSearch control={control} error={errors.userId?.message} />
        ) : (
          <>
            <Input
              label="Nome completo"
              id="fullName"
              data-testid="professional-form-fullname"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              label="E-mail"
              id="email"
              type="email"
              data-testid="professional-form-email"
              error={errors.email?.message}
              {...register('email')}
            />
          </>
        )}

        <RegistrationListField
          value={registrationsFieldCtl.value as IProfessionalRegistrationInput[]}
          onChange={handleRegistrationsChange}
          error={fieldArrayError(errors.registrations)}
        />

        {isMedicalProfessional && (
          <SpecialtyCheckboxGroup
            specialties={specialties}
            value={specialtyField.value as SpecialtyValue[]}
            isLoading={isLoadingSpecialties}
            showRegistryNumber
            onToggle={toggleSpecialty}
            onRqeChange={changeRqe}
          />
        )}

        <TextAreaField
          label="Bio"
          id="bio"
          testId="professional-form-bio"
          error={errors.bio?.message}
          registerProps={register('bio')}
          optional
        />
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="professional-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar profissional'}
        </Button>
      </div>
    </form>
  )
}

function ProfessionalFormEdit({ defaultValues, isPending, globalError, onSubmit }: ProfessionalFormEditProps) {
  const authUser = useAuthStore((state) => state.user)
  const isAdmin = authUser?.role === UserRole.ADMIN
  /* c8 ignore next */
  const clinicId = authUser?.clinicId ?? ''

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      registrations: defaultValues.registrations.map((c) => ({
        councilType: c.councilType,
        number: c.number,
        state: c.state,
        isPrimary: c.isPrimary,
      })),
      specialties: defaultValues.specialties.map((s) => ({ specialtyId: s.id, registryNumber: s.registryNumber ?? '' })),
      isActive: defaultValues.user.isActive,
    },
  })

  const { field: registrationsFieldCtl } = useController({ name: 'registrations', control })
  const { field: specialtyField } = useController({ name: 'specialties', control })

  const { data: clinicSpecialtiesResponse, isPending: isLoadingSpecialties } = useQuery({
    queryKey: ['clinic-specialties-for-select', clinicId],
    queryFn: () => clinicSpecialtiesService.getAll(clinicId, { limit: 100 }),
    enabled: !!clinicId,
  })

  const specialties = (clinicSpecialtiesResponse?.data ?? []).map((s) => ({
    id: s.specialtyId,
    name: s.name,
  }))

  const isMedicalProfessional = showsRegistryNumber(registrationsFieldCtl.value as IProfessionalRegistrationInput[])

  function handleRegistrationsChange(next: IProfessionalRegistrationInput[]) {
    const wasCrm = showsRegistryNumber(registrationsFieldCtl.value as IProfessionalRegistrationInput[])
    registrationsFieldCtl.onChange(next)
    if (wasCrm && !showsRegistryNumber(next)) {
      specialtyField.onChange([])
    }
  }

  useEffect(() => {
    reset({
      registrations: defaultValues.registrations.map((c) => ({
        councilType: c.councilType,
        number: c.number,
        state: c.state,
        isPrimary: c.isPrimary,
      })),
      specialties: defaultValues.specialties.map((s) => ({ specialtyId: s.id, registryNumber: s.registryNumber ?? '' })),
      bio: defaultValues.bio ?? '',
      isActive: defaultValues.user.isActive,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdateProfessionalInput = {
      registrations: data.registrations,
      specialties: toProfessionalSpecialtiesInput(data.specialties),
      bio: data.bio || undefined,
      isActive: isAdmin ? data.isActive : undefined,
    }
    onSubmit(
      input,
      setError as (field: keyof IUpdateProfessionalInput, error: { message: string }) => void,
    )
  }

  function toggleSpecialty(id: string) {
    const current = specialtyField.value as SpecialtyValue[]
    if (current.some((s) => s.specialtyId === id)) {
      specialtyField.onChange(current.filter((s) => s.specialtyId !== id))
    } else {
      specialtyField.onChange([...current, { specialtyId: id, registryNumber: '' }])
    }
  }

  function changeRqe(id: string, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    const current = specialtyField.value as SpecialtyValue[]
    specialtyField.onChange(current.map((s) => (s.specialtyId === id ? { ...s, registryNumber: digits } : s)))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="professional-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="professional-form-error">
            {globalError}
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Usuário vinculado</label>
          <div
            className="flex h-10 w-full items-center rounded-md border border-line bg-surface-2 px-3 text-sm text-text-dim"
            data-testid="professional-form-user-readonly"
          >
            {defaultValues.user.fullName} — {defaultValues.user.email}
          </div>
          <p className="text-xs text-text-mute">O usuário vinculado não pode ser alterado.</p>
        </div>

        <RegistrationListField
          value={registrationsFieldCtl.value as IProfessionalRegistrationInput[]}
          onChange={handleRegistrationsChange}
          error={fieldArrayError(errors.registrations)}
        />

        {isMedicalProfessional && (
          <SpecialtyCheckboxGroup
            specialties={specialties}
            value={specialtyField.value as SpecialtyValue[]}
            isLoading={isLoadingSpecialties}
            showRegistryNumber
            onToggle={toggleSpecialty}
            onRqeChange={changeRqe}
          />
        )}

        <TextAreaField
          label="Bio"
          id="bio"
          testId="professional-form-bio"
          error={errors.bio?.message}
          registerProps={register('bio')}
          optional
        />

        {isAdmin && (
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              data-testid="professional-form-isactive"
              className="h-4 w-4 rounded border-line accent-accent"
              {...register('isActive')}
            />
            <span className="text-sm text-text">Profissional ativo</span>
          </label>
        )}

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="professional-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function RegistrationListField({
  value,
  onChange,
  error,
}: {
  value: IProfessionalRegistrationInput[]
  onChange: (value: IProfessionalRegistrationInput[]) => void
  error?: string
}) {
  function setCouncilType(index: number, councilType: CouncilType) {
    onChange(value.map((registration, idx) => (idx === index ? { ...registration, councilType } : registration)))
  }

  function setNumber(index: number, raw: string, councilType: CouncilType) {
    const number = filterRegistrationNumber(raw, councilType)
    onChange(value.map((registration, idx) => (idx === index ? { ...registration, number } : registration)))
  }

  function setState(index: number, raw: string) {
    const state = raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2)
    onChange(value.map((registration, idx) => (idx === index ? { ...registration, state } : registration)))
  }

  function setPrimary(index: number) {
    onChange(value.map((registration, idx) => ({ ...registration, isPrimary: idx === index })))
  }

  function addRegistration() {
    onChange([...value, { councilType: CouncilType.CRM, number: '', state: '', isPrimary: value.length === 0 }])
  }

  function removeRegistration(index: number) {
    const next = value.filter((_, idx) => idx !== index)
    if (next.length > 0 && !next.some((registration) => registration.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true }
    }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="professional-form-registration-group">
      <label className="text-sm font-medium text-text">Registros Profissionais</label>
      <div className="flex flex-col gap-2">
        {value.map((registration, index) => {
          const format = COUNCIL_REGISTRATION_FORMATS[registration.councilType]
          return (
            <div
              key={index}
              className="flex items-end gap-2"
              data-testid={`professional-form-registration-row-${index}`}
            >
              <select
                value={registration.councilType}
                onChange={(e) => setCouncilType(index, e.target.value as CouncilType)}
                data-testid={`professional-form-registration-council-type-${index}`}
                className="h-10 w-28 rounded-md border border-line bg-surface px-2 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {COUNCIL_TYPES.map((councilType) => (
                  <option key={councilType} value={councilType}>
                    {COUNCIL_TYPE_LABELS[councilType]}
                  </option>
                ))}
              </select>
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor={`professional-form-registration-number-${index}`}
                  className="text-[10px] font-medium uppercase tracking-wide text-text-mute"
                >
                  {format.label}
                </label>
                <input
                  id={`professional-form-registration-number-${index}`}
                  type="text"
                  autoComplete="off"
                  maxLength={format.numberMaxLength}
                  placeholder={format.numberPlaceholder}
                  value={registration.number}
                  onChange={(e) => setNumber(index, e.target.value, registration.councilType)}
                  data-testid={`professional-form-registration-number-${index}`}
                  className="h-10 w-32 rounded-md border border-line bg-surface px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>
              <select
                value={registration.state}
                onChange={(e) => setState(index, e.target.value)}
                data-testid={`professional-form-registration-state-${index}`}
                className="h-10 w-20 rounded-md border border-line bg-surface px-2 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">UF</option>
                {BRAZILIAN_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-text">
                <input
                  type="radio"
                  name="primary-registration"
                  checked={registration.isPrimary}
                  onChange={() => setPrimary(index)}
                  data-testid={`professional-form-registration-primary-${index}`}
                  className="accent-accent"
                />
                Principal
              </label>
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRegistration(index)}
                  data-testid={`professional-form-registration-remove-${index}`}
                  className="text-sm text-danger hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={addRegistration}
        data-testid="professional-form-registration-add"
        className="self-start text-sm text-accent hover:underline"
      >
        + Adicionar registro
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}

function SpecialtyCheckboxGroup({
  specialties,
  value,
  isLoading,
  showRegistryNumber,
  onToggle,
  onRqeChange,
}: {
  specialties: Array<{ id: string; name: string }>
  value: SpecialtyValue[]
  isLoading: boolean
  showRegistryNumber: boolean
  onToggle: (id: string) => void
  onRqeChange: (id: string, value: string) => void
}) {
  function rqeFor(id: string): string {
    return value.find((s) => s.specialtyId === id)?.registryNumber ?? ''
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="professional-form-specialty-group">
      <label className="text-sm font-medium text-text">Especialidades</label>
      {isLoading ? (
        <p className="text-sm text-text-mute" data-testid="professional-form-specialty-loading">
          Carregando especialidades...
        </p>
      ) : (
        <div
          className={cn('max-h-64 overflow-y-auto rounded-md border p-3', 'bg-surface', 'border-line')}
        >
          {specialties.length === 0 ? (
            <p className="text-sm text-text-mute">Nenhuma especialidade cadastrada.</p>
          ) : (
            specialties.map((specialty) => {
              const checked = value.some((s) => s.specialtyId === specialty.id)
              return (
                <div key={specialty.id} className="flex flex-col gap-1 rounded px-1 py-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-text hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(specialty.id)}
                      data-testid={`professional-form-specialty-${specialty.id}`}
                      className="accent-accent"
                    />
                    {specialty.name}
                  </label>
                  {checked && showRegistryNumber && (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      placeholder="RQE (opcional)"
                      value={rqeFor(specialty.id)}
                      onChange={(e) => onRqeChange(specialty.id, e.target.value)}
                      data-testid={`professional-form-registryNumber-${specialty.id}`}
                      className="ml-6 h-9 w-40 rounded-md border border-line bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
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
    if (field.value) field.onChange(undefined)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => setDebouncedTerm(value), 300)
  }

  function handleSelect(user: { id: string; fullName: string; email: string }) {
    field.onChange(user.id)
    setInputValue(`${user.fullName} — ${user.email}`)
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
        data-testid="professional-form-user-search"
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
          data-testid="professional-form-user-search-results"
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
                data-testid="professional-form-user-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(u)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent/10"
              >
                {u.fullName} — {u.email}
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
          'bg-surface border border-line',
          'text-text',
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
