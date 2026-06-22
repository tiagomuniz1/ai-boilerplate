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
import type { ICreateDoctorInput, IUpdateDoctorInput } from '../types/doctor-input.types'
import type { IDoctorModel } from '../types/doctor-model.types'

const crmRegex = /^\d{1,6}\/[A-Z]{2}$/

const crmField = z
  .string()
  .min(1, 'CRM obrigatório')
  .regex(crmRegex, 'CRM inválido. Use o formato NNNNN/UF (ex: 12345/SP)')

const specialtyIdsField = z
  .array(z.string().uuid())
  .min(1, 'Selecione ao menos uma especialidade')

const bioField = z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional()

const createSchema = z
  .object({
    userMode: z.enum(['existing', 'new']),
    userId: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    crmNumber: crmField,
    specialtyIds: specialtyIdsField,
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
  crmNumber: crmField.optional().or(z.literal('')),
  specialtyIds: specialtyIdsField,
  bio: bioField,
  isActive: z.boolean(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>


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
    defaultValues: { userMode: 'existing', specialtyIds: [] },
  })

  const { field: specialtyField } = useController({ name: 'specialtyIds', control })
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
        ? { userId: data.userId, crmNumber: data.crmNumber, specialtyIds: data.specialtyIds, bio: data.bio || undefined }
        : { fullName: data.fullName, email: data.email, crmNumber: data.crmNumber, specialtyIds: data.specialtyIds, bio: data.bio || undefined }
    onSubmit(input, setError as (field: keyof ICreateDoctorInput, error: { message: string }) => void)
  }

  function toggleSpecialty(id: string) {
    const current = specialtyField.value
    if (current.includes(id)) {
      specialtyField.onChange(current.filter((v) => v !== id))
    } else {
      specialtyField.onChange([...current, id])
    }
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

        <Input
          label="CRM"
          id="crmNumber"
          placeholder="12345/SP"
          data-testid="doctor-form-crm"
          error={errors.crmNumber?.message}
          {...register('crmNumber')}
        />

        <SpecialtyCheckboxGroup
          specialties={specialties}
          selectedIds={specialtyField.value}
          isLoading={isLoadingSpecialties}
          error={errors.specialtyIds?.message as string | undefined}
          onToggle={toggleSpecialty}
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
      specialtyIds: defaultValues.specialties.map((s) => s.id),
      isActive: defaultValues.user.isActive,
    },
  })

  const { field: specialtyField } = useController({ name: 'specialtyIds', control })

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
      crmNumber: defaultValues.crmNumber,
      specialtyIds: defaultValues.specialties.map((s) => s.id),
      bio: defaultValues.bio ?? '',
      isActive: defaultValues.user.isActive,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdateDoctorInput = {
      crmNumber: data.crmNumber || undefined,
      specialtyIds: data.specialtyIds,
      bio: data.bio || undefined,
      isActive: isAdmin ? data.isActive : undefined,
    }
    onSubmit(
      input,
      setError as (field: keyof IUpdateDoctorInput, error: { message: string }) => void,
    )
  }

  function toggleSpecialty(id: string) {
    const current = specialtyField.value
    if (current.includes(id)) {
      specialtyField.onChange(current.filter((v) => v !== id))
    } else {
      specialtyField.onChange([...current, id])
    }
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

        <Input
          label="CRM"
          id="crmNumber"
          placeholder="12345/SP"
          data-testid="doctor-form-crm"
          error={errors.crmNumber?.message}
          {...register('crmNumber')}
        />

        <SpecialtyCheckboxGroup
          specialties={specialties}
          selectedIds={specialtyField.value}
          isLoading={isLoadingSpecialties}
          error={errors.specialtyIds?.message as string | undefined}
          onToggle={toggleSpecialty}
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

function SpecialtyCheckboxGroup({
  specialties,
  selectedIds,
  isLoading,
  error,
  onToggle,
}: {
  specialties: Array<{ id: string; name: string }>
  selectedIds: string[]
  isLoading: boolean
  error?: string
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5" data-testid="doctor-form-specialty-group">
      <label className="text-sm font-medium text-text">Especialidades</label>
      {isLoading ? (
        <p className="text-sm text-text-mute" data-testid="doctor-form-specialty-loading">
          Carregando especialidades...
        </p>
      ) : (
        <div
          className={cn(
            'max-h-48 overflow-y-auto rounded-md border p-3',
            'bg-surface',
            error ? 'border-danger' : 'border-line',
          )}
        >
          {specialties.length === 0 ? (
            <p className="text-sm text-text-mute">Nenhuma especialidade cadastrada.</p>
          ) : (
            specialties.map((specialty) => (
              <label
                key={specialty.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm text-text hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(specialty.id)}
                  onChange={() => onToggle(specialty.id)}
                  data-testid={`doctor-form-specialty-${specialty.id}`}
                  className="accent-accent"
                />
                {specialty.name}
              </label>
            ))
          )}
        </div>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
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
