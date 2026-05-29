'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import type { ICreateSpecialtyInput, IUpdateSpecialtyInput } from '../types/specialty-input.types'
import type { ISpecialtyModel } from '../types/specialty-model.types'

const nameField = z
  .string()
  .min(3, 'Nome deve ter no mínimo 3 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')

const descriptionField = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres')
  .optional()

const createSchema = z.object({
  name: nameField,
  description: descriptionField,
})

const updateSchema = z.object({
  name: nameField.optional().or(z.literal('')),
  description: descriptionField,
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

interface SpecialtyFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateSpecialtyInput,
    setError: (field: keyof ICreateSpecialtyInput, error: { message: string }) => void,
  ) => void
}

interface SpecialtyFormEditProps {
  mode: 'edit'
  defaultValues: ISpecialtyModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateSpecialtyInput,
    setError: (field: keyof IUpdateSpecialtyInput, error: { message: string }) => void,
  ) => void
}

type SpecialtyFormProps = SpecialtyFormCreateProps | SpecialtyFormEditProps

export function SpecialtyForm(props: SpecialtyFormProps) {
  if (props.mode === 'create') {
    return <SpecialtyFormCreate {...props} />
  }
  return <SpecialtyFormEdit {...props} />
}

function SpecialtyFormCreate({ isPending, globalError, onSubmit }: SpecialtyFormCreateProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
  })

  function handleFormSubmit(data: CreateFormValues) {
    onSubmit(
      { name: data.name, description: data.description || undefined },
      setError as (field: keyof ICreateSpecialtyInput, error: { message: string }) => void,
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="specialty-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="specialty-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Nome"
          id="name"
          data-testid="specialty-form-name"
          error={errors.name?.message}
          {...register('name')}
        />

        <TextAreaField
          label="Descrição"
          id="description"
          testId="specialty-form-description"
          error={errors.description?.message}
          registerProps={register('description')}
          optional
        />

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="specialty-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar especialidade'}
        </Button>
      </div>
    </form>
  )
}

function SpecialtyFormEdit({ defaultValues, isPending, globalError, onSubmit }: SpecialtyFormEditProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
  })

  const [clearDescription, setClearDescription] = useState(false)

  useEffect(() => {
    reset({
      name: defaultValues.name,
      description: defaultValues.description ?? '',
    })
    setClearDescription(false)
  }, [defaultValues, reset])

  function handleFormSubmit(data: UpdateFormValues) {
    const input: IUpdateSpecialtyInput = {
      name: data.name || undefined,
      description: clearDescription ? null : data.description || undefined,
    }
    onSubmit(
      input,
      setError as (field: keyof IUpdateSpecialtyInput, error: { message: string }) => void,
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="specialty-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="specialty-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Nome"
          id="name"
          data-testid="specialty-form-name"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="flex flex-col gap-1.5">
          <TextAreaField
            label="Descrição"
            id="description"
            testId="specialty-form-description"
            error={errors.description?.message}
            registerProps={register('description')}
            optional
            disabled={clearDescription}
          />
          {defaultValues.description !== null && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-dim">
              <input
                type="checkbox"
                checked={clearDescription}
                onChange={(e) => setClearDescription(e.target.checked)}
                data-testid="specialty-form-clear-description"
              />
              Remover descrição
            </label>
          )}
        </div>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="specialty-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function TextAreaField({
  label,
  id,
  testId,
  error,
  registerProps,
  optional,
  disabled,
}: {
  label: string
  id: string
  testId: string
  error?: string
  registerProps: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }
  optional?: boolean
  disabled?: boolean
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
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'w-full rounded-md px-3 py-2 text-base',
          'bg-surface border border-line',
          'text-text',
          'resize-none transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
          disabled && 'opacity-50 cursor-not-allowed',
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
