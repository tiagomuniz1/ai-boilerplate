'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserRole } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import type { ICreateUserInput, IUpdateUserInput } from '../types/user-input.types'
import type { IUserModel } from '../types/user-model.types'
import type { IApiError } from '@/types/api.types'

const createSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Role inválida' }) }),
})

const updateSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Role inválida' }) }).optional(),
  isActive: z.boolean(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

interface UserFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
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

function UserFormCreate({ isPending, globalError, onSubmit }: UserFormCreateProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: UserRole.USER },
  })

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
        <RoleSelect registerProps={register('role')} error={errors.role?.message} />
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
  const {
    register,
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
        <RoleSelect registerProps={register('role')} error={errors.role?.message} />
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
}: {
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  error?: string
}) {
  const selectId = 'role'
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-text"
      >
        Role
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
        <option value={UserRole.USER}>Usuário</option>
        <option value={UserRole.ADMIN}>Administrador</option>
      </select>
      {error && (
        <span id={`${selectId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
