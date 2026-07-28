'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import { useBasePath } from '@/lib/slug-context'
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from '@/lib/user-role-labels'
import { useProfessionalByUserId } from '../hooks/use-professional-by-user-id.hook'
import type { ICreateUserInput, IUpdateUserInput } from '../types/user-input.types'
import type { IUserModel } from '../types/user-model.types'
import type { IApiError } from '@/types/api.types'

const createSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil de acesso inválido' }) }),
})

const updateSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil de acesso inválido' }) }).optional(),
  isActive: z.boolean(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

interface UserFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  availableRoles?: UserRole[]
  onSubmit: (data: ICreateUserInput, setError: (field: keyof ICreateUserInput, error: { message: string }) => void) => void
}

interface UserFormEditProps {
  mode: 'edit'
  defaultValues: IUserModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (data: IUpdateUserInput, setError: (field: keyof IUpdateUserInput, error: { message: string }) => void) => void
}

type UserFormProps = UserFormCreateProps | UserFormEditProps

export function UserForm(props: UserFormProps) {
  if (props.mode === 'create') {
    return <UserFormCreate {...props} />
  }
  return <UserFormEdit {...props} />
}

const DEFAULT_ROLES = [UserRole.USER, UserRole.ADMIN]

function UserFormCreate({ isPending, globalError, availableRoles = DEFAULT_ROLES, onSubmit }: UserFormCreateProps) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: UserRole.USER },
  })

  const selectedRole = watch('role')

  function handleFormSubmit(data: CreateFormValues) {
    onSubmit(data, setError as (field: keyof ICreateUserInput, error: { message: string }) => void)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="user-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="user-form-error">
            {globalError}
          </Alert>
        )}
        <Input
          label="Nome completo"
          id="fullName"
          data-testid="user-form-fullname"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="E-mail"
          id="email"
          type="email"
          data-testid="user-form-email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          id="password"
          type="password"
          autoComplete="new-password"
          data-testid="user-form-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <RoleSelect
          registerProps={register('role')}
          error={errors.role?.message}
          availableRoles={availableRoles}
          selectedRole={selectedRole}
        />
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="user-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar usuário'}
        </Button>
      </div>
    </form>
  )
}

function UserFormEdit({ defaultValues, isPending, globalError, onSubmit }: UserFormEditProps) {
  const basePath = useBasePath()
  const isProfessional = defaultValues.role === UserRole.PROFESSIONAL
  const { professional } = useProfessionalByUserId(defaultValues.id, { enabled: isProfessional })

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
  })

  const selectedRole = watch('role')

  useEffect(() => {
    reset({
      fullName: defaultValues.fullName,
      email: defaultValues.email,
      role: defaultValues.role,
      isActive: defaultValues.isActive,
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdateUserInput = {
      fullName: data.fullName || undefined,
      email: data.email || undefined,
      role: data.role,
      isActive: data.isActive,
    }
    onSubmit(input, setError as (field: keyof IUpdateUserInput, error: { message: string }) => void)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="user-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="user-form-error">
            {globalError}
          </Alert>
        )}
        <Input
          label="Nome completo"
          id="fullName"
          data-testid="user-form-fullname"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="E-mail"
          id="email"
          type="email"
          data-testid="user-form-email"
          error={errors.email?.message}
          {...register('email')}
        />
        {isProfessional ? (
          <ProfessionalRoleNotice basePath={basePath} professionalId={professional?.id} />
        ) : (
          <RoleSelect
            registerProps={register('role')}
            error={errors.role?.message}
            selectedRole={selectedRole}
          />
        )}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            data-testid="user-form-isactive"
            className="h-4 w-4 rounded border-line accent-accent"
            {...register('isActive')}
          />
          <span className="text-sm text-text">Usuário ativo</span>
        </label>
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="user-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function RoleSelect({
  registerProps,
  error,
  availableRoles = DEFAULT_ROLES,
  selectedRole,
}: {
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  error?: string
  availableRoles?: UserRole[]
  selectedRole?: UserRole
}) {
  const selectId = 'role'
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-text"
      >
        Perfil de acesso
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
        data-testid="user-form-role"
        {...registerProps}
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {USER_ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      {selectedRole && (
        <p className="text-xs text-text-dim" data-testid="user-form-role-description">
          {USER_ROLE_DESCRIPTIONS[selectedRole]}
        </p>
      )}
      {error && (
        <span id={`${selectId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}

function ProfessionalRoleNotice({ basePath, professionalId }: { basePath: string; professionalId?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">Perfil de acesso</span>
      <p className="text-sm text-text" data-testid="user-form-role-readonly">
        {USER_ROLE_LABELS[UserRole.PROFESSIONAL]}
      </p>
      <p className="text-xs text-text-dim">{USER_ROLE_DESCRIPTIONS[UserRole.PROFESSIONAL]}</p>
      <p className="text-xs text-text-dim" data-testid="user-form-professional-notice">
        Profissão e registro (CRM/CRN/etc.) são gerenciados na tela de Profissionais.
        {professionalId && (
          <>
            {' '}
            <Link
              href={`${basePath}/professionals/${professionalId}/edit`}
              className="text-accent hover:underline"
              data-testid="user-form-professional-link"
            >
              Editar profissional
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
