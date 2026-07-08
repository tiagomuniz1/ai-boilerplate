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
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { userService } from '@/components/features/users/services/users.service'
import { clinicSpecialtiesService } from '@/components/features/clinic-specialties/services/clinic-specialties.service'
import type { ICreateDoctorInput, IDoctorCrmInput, IUpdateDoctorInput } from '../types/doctor-input.types'
import type { IDoctorModel } from '../types/doctor-model.types'

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const crmsField = z
  .array(
    z.object({
      number: z.string(),
      state: z.string(),
      isPrimary: z.boolean(),
    }),
  )
  .min(1, 'Informe ao menos um CRM')
  .refine(
    (crms) => crms.every((crm) => /^\d{1,6}$/.test(crm.number) && /^[A-Z]{2}$/.test(crm.state)),
    'Preencha número e UF de todos os CRMs',
  )

const specialtiesField = z
  .array(
    z.object({
      specialtyId: z.string().uuid(),
      rqe: z
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
    crms: crmsField,
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
  crms: crmsField,
  specialties: specialtiesField,
  bio: bioField,
  isActive: z.boolean(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

type SpecialtyValue = { specialtyId: string; rqe?: string }

function fieldArrayError(error: unknown): string | undefined {
  const err = error as { message?: string; root?: { message?: string } } | undefined
  return err?.message ?? err?.root?.message
}

function toDoctorSpecialtiesInput(specialties: SpecialtyValue[]) {
  return specialties.map((specialty) => ({
    specialtyId: specialty.specialtyId,
    rqe: specialty.rqe ? specialty.rqe : undefined,
  }))
}

interface DoctorFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateDoctorInput,
    setError: (field: keyof ICreateDoctorInput, error: { message: string }) => void,
  ) => void
}

interface DoctorFormEditProps {
  mode: 'edit'
  defaultValues: IDoctorModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateDoctorInput,
    setError: (field: keyof IUpdateDoctorInput, error: { message: string }) => void,
  ) => void
}

type DoctorFormProps = DoctorFormCreateProps | DoctorFormEditProps

export function DoctorForm(props: DoctorFormProps) {
  if (props.mode === 'create') {
    return <DoctorFormCreate {...props} />
  }
  return <DoctorFormEdit {...props} />
}

function DoctorFormCreate({ isPending, globalError, onSubmit }: DoctorFormCreateProps) {
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
      crms: [{ number: '', state: '', isPrimary: true }],
      specialties: [],
    },
  })

  const { field: crmsFieldCtl } = useController({ name: 'crms', control })
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

  function handleFormSubmit(data: CreateFormValues) {
    const input: ICreateDoctorInput =
      data.userMode === 'existing'
        ? {
            userId: data.userId,
            crms: data.crms,
            specialties: toDoctorSpecialtiesInput(data.specialties),
            bio: data.bio || undefined,
          }
        : {
            fullName: data.fullName,
            email: data.email,
            crms: data.crms,
            specialties: toDoctorSpecialtiesInput(data.specialties),
            bio: data.bio || undefined,
          }
    onSubmit(input, setError as (field: keyof ICreateDoctorInput, error: { message: string }) => void)
  }

  function toggleSpecialty(id: string) {
    const current = specialtyField.value as SpecialtyValue[]
    if (current.some((s) => s.specialtyId === id)) {
      specialtyField.onChange(current.filter((s) => s.specialtyId !== id))
    } else {
      specialtyField.onChange([...current, { specialtyId: id, rqe: '' }])
    }
  }

  function changeRqe(id: string, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    const current = specialtyField.value as SpecialtyValue[]
    specialtyField.onChange(current.map((s) => (s.specialtyId === id ? { ...s, rqe: digits } : s)))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="doctor-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="doctor-form-error">
            {globalError}
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Usuário</span>
          <div className="flex gap-4" data-testid="doctor-form-user-mode">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                value="existing"
                data-testid="doctor-form-user-mode-existing"
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
                data-testid="doctor-form-user-mode-new"
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
              data-testid="doctor-form-fullname"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              label="E-mail"
              id="email"
              type="email"
              data-testid="doctor-form-email"
              error={errors.email?.message}
              {...register('email')}
            />
          </>
        )}

        <CrmListField
          value={crmsFieldCtl.value as IDoctorCrmInput[]}
          onChange={crmsFieldCtl.onChange}
          error={fieldArrayError(errors.crms)}
        />

        <SpecialtyCheckboxGroup
          specialties={specialties}
          value={specialtyField.value as SpecialtyValue[]}
          isLoading={isLoadingSpecialties}
          onToggle={toggleSpecialty}
          onRqeChange={changeRqe}
        />

        <TextAreaField
          label="Bio"
          id="bio"
          testId="doctor-form-bio"
          error={errors.bio?.message}
          registerProps={register('bio')}
          optional
        />
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="doctor-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar médico'}
        </Button>
      </div>
    </form>
  )
}

function DoctorFormEdit({ defaultValues, isPending, globalError, onSubmit }: DoctorFormEditProps) {
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
      crms: defaultValues.crms.map((c) => ({ number: c.number, state: c.state, isPrimary: c.isPrimary })),
      specialties: defaultValues.specialties.map((s) => ({ specialtyId: s.id, rqe: s.rqe ?? '' })),
      isActive: defaultValues.user.isActive,
    },
  })

  const { field: crmsFieldCtl } = useController({ name: 'crms', control })
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

  useEffect(() => {
    reset({
      crms: defaultValues.crms.map((c) => ({ number: c.number, state: c.state, isPrimary: c.isPrimary })),
      specialties: defaultValues.specialties.map((s) => ({ specialtyId: s.id, rqe: s.rqe ?? '' })),
      bio: defaultValues.bio ?? '',
      isActive: defaultValues.user.isActive,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdateDoctorInput = {
      crms: data.crms,
      specialties: toDoctorSpecialtiesInput(data.specialties),
      bio: data.bio || undefined,
      isActive: isAdmin ? data.isActive : undefined,
    }
    onSubmit(
      input,
      setError as (field: keyof IUpdateDoctorInput, error: { message: string }) => void,
    )
  }

  function toggleSpecialty(id: string) {
    const current = specialtyField.value as SpecialtyValue[]
    if (current.some((s) => s.specialtyId === id)) {
      specialtyField.onChange(current.filter((s) => s.specialtyId !== id))
    } else {
      specialtyField.onChange([...current, { specialtyId: id, rqe: '' }])
    }
  }

  function changeRqe(id: string, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    const current = specialtyField.value as SpecialtyValue[]
    specialtyField.onChange(current.map((s) => (s.specialtyId === id ? { ...s, rqe: digits } : s)))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="doctor-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="doctor-form-error">
            {globalError}
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Usuário vinculado</label>
          <div
            className="flex h-10 w-full items-center rounded-md border border-line bg-surface-2 px-3 text-sm text-text-dim"
            data-testid="doctor-form-user-readonly"
          >
            {defaultValues.user.fullName} — {defaultValues.user.email}
          </div>
          <p className="text-xs text-text-mute">O usuário vinculado não pode ser alterado.</p>
        </div>

        <CrmListField
          value={crmsFieldCtl.value as IDoctorCrmInput[]}
          onChange={crmsFieldCtl.onChange}
          error={fieldArrayError(errors.crms)}
        />

        <SpecialtyCheckboxGroup
          specialties={specialties}
          value={specialtyField.value as SpecialtyValue[]}
          isLoading={isLoadingSpecialties}
          onToggle={toggleSpecialty}
          onRqeChange={changeRqe}
        />

        <TextAreaField
          label="Bio"
          id="bio"
          testId="doctor-form-bio"
          error={errors.bio?.message}
          registerProps={register('bio')}
          optional
        />

        {isAdmin && (
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              data-testid="doctor-form-isactive"
              className="h-4 w-4 rounded border-line accent-accent"
              {...register('isActive')}
            />
            <span className="text-sm text-text">Médico ativo</span>
          </label>
        )}

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="doctor-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function CrmListField({
  value,
  onChange,
  error,
}: {
  value: IDoctorCrmInput[]
  onChange: (value: IDoctorCrmInput[]) => void
  error?: string
}) {
  function setNumber(index: number, raw: string) {
    const number = raw.replace(/\D/g, '').slice(0, 6)
    onChange(value.map((crm, idx) => (idx === index ? { ...crm, number } : crm)))
  }

  function setState(index: number, raw: string) {
    const state = raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2)
    onChange(value.map((crm, idx) => (idx === index ? { ...crm, state } : crm)))
  }

  function setPrimary(index: number) {
    onChange(value.map((crm, idx) => ({ ...crm, isPrimary: idx === index })))
  }

  function addCrm() {
    onChange([...value, { number: '', state: '', isPrimary: value.length === 0 }])
  }

  function removeCrm(index: number) {
    const next = value.filter((_, idx) => idx !== index)
    if (next.length > 0 && !next.some((crm) => crm.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true }
    }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="doctor-form-crm-group">
      <label className="text-sm font-medium text-text">CRM</label>
      <div className="flex flex-col gap-2">
        {value.map((crm, index) => (
          <div key={index} className="flex items-center gap-2" data-testid={`doctor-form-crm-row-${index}`}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="12345"
              value={crm.number}
              onChange={(e) => setNumber(index, e.target.value)}
              data-testid={`doctor-form-crm-number-${index}`}
              className="h-10 w-28 rounded-md border border-line bg-surface px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <select
              value={crm.state}
              onChange={(e) => setState(index, e.target.value)}
              data-testid={`doctor-form-crm-state-${index}`}
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
                name="primary-crm"
                checked={crm.isPrimary}
                onChange={() => setPrimary(index)}
                data-testid={`doctor-form-crm-primary-${index}`}
                className="accent-accent"
              />
              Principal
            </label>
            {value.length > 1 && (
              <button
                type="button"
                onClick={() => removeCrm(index)}
                data-testid={`doctor-form-crm-remove-${index}`}
                className="text-sm text-danger hover:underline"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCrm}
        data-testid="doctor-form-crm-add"
        className="self-start text-sm text-accent hover:underline"
      >
        + Adicionar CRM
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
  onToggle,
  onRqeChange,
}: {
  specialties: Array<{ id: string; name: string }>
  value: SpecialtyValue[]
  isLoading: boolean
  onToggle: (id: string) => void
  onRqeChange: (id: string, value: string) => void
}) {
  function rqeFor(id: string): string {
    return value.find((s) => s.specialtyId === id)?.rqe ?? ''
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="doctor-form-specialty-group">
      <label className="text-sm font-medium text-text">Especialidades</label>
      {isLoading ? (
        <p className="text-sm text-text-mute" data-testid="doctor-form-specialty-loading">
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
                      data-testid={`doctor-form-specialty-${specialty.id}`}
                      className="accent-accent"
                    />
                    {specialty.name}
                  </label>
                  {checked && (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      placeholder="RQE (opcional)"
                      value={rqeFor(specialty.id)}
                      onChange={(e) => onRqeChange(specialty.id, e.target.value)}
                      data-testid={`doctor-form-rqe-${specialty.id}`}
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
        data-testid="doctor-form-user-search"
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
          data-testid="doctor-form-user-search-results"
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
                data-testid="doctor-form-user-option"
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
