'use client'

import { useEffect } from 'react'
import { useForm, useController } from 'react-hook-form'
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
import { specialtiesService } from '@/components/features/specialties/services/specialties.service'
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

const createSchema = z.object({
  userId: z.string().min(1, 'Selecione um usuário'),
  crmNumber: crmField,
  specialtyIds: specialtyIdsField,
  bio: bioField,
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
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { specialtyIds: [] },
  })

  const { field: specialtyField } = useController({ name: 'specialtyIds', control })

  const { data: usersResponse, isPending: isLoadingUsers } = useQuery({
    queryKey: ['users-for-select'],
    queryFn: () => userService.getAll({ limit: 100 }),
  })

  const { data: specialtiesResponse, isPending: isLoadingSpecialties } = useQuery({
    queryKey: ['specialties-for-select'],
    queryFn: () => specialtiesService.getAll({ limit: 100 }),
  })

  const users = usersResponse?.data ?? []
  const specialties = specialtiesResponse?.data ?? []

  function handleFormSubmit(data: CreateFormValues) {
    onSubmit(
      { userId: data.userId, crmNumber: data.crmNumber, specialtyIds: data.specialtyIds, bio: data.bio || undefined },
      setError as (field: keyof ICreateDoctorInput, error: { message: string }) => void,
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

        <UserSelect
          registerProps={register('userId')}
          error={errors.userId?.message}
          users={users}
          isLoading={isLoadingUsers}
          disabled={false}
        />

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

  const { data: specialtiesResponse, isPending: isLoadingSpecialties } = useQuery({
    queryKey: ['specialties-for-select'],
    queryFn: () => specialtiesService.getAll({ limit: 100 }),
  })

  const specialties = specialtiesResponse?.data ?? []

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

function UserSelect({
  registerProps,
  error,
  users,
  isLoading,
  disabled,
}: {
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  error?: string
  users: Array<{ id: string; fullName: string; email: string }>
  isLoading: boolean
  disabled: boolean
}) {
  const selectId = 'userId'
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-text">
        Usuário
      </label>
      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        disabled={disabled || isLoading}
        className={cn(
          'h-10 w-full rounded-md px-3 text-base',
          'bg-surface border border-line',
          'text-text',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        )}
        data-testid="doctor-form-user"
        {...registerProps}
      >
        <option value="">{isLoading ? 'Carregando...' : '— Selecione —'}</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.fullName} — {user.email}
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
