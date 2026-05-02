'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useLogin } from '../hooks/use-login.hook'
import type { IApiError } from '@/types/api.types'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const { mutate, isPending } = useLogin()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormValues) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof FormValues, { message })
          })
        } else if (error.status === 401) {
          setGlobalError('Email ou senha inválidos')
        } else {
          setGlobalError('Não foi possível fazer login. Tente novamente.')
        }
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} data-testid="login-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="login-error">
            {globalError}
          </Alert>
        )}
        <Input
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          data-testid="login-email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          id="password"
          type="password"
          autoComplete="current-password"
          data-testid="login-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="login-submit"
        >
          Entrar
        </Button>
      </div>
    </form>
  )
}
