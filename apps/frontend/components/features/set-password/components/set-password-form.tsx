'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useValidateSetPasswordToken } from '../hooks/use-validate-set-password-token.hook'
import { useSetPassword } from '../hooks/use-set-password.hook'
import type { IApiError } from '@/types/api.types'

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function SetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: validation, isLoading } = useValidateSetPasswordToken(token)
  const { mutate, isPending } = useSetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormValues) {
    setSubmitError(null)
    mutate(
      { token: token!, password: data.password },
      {
        onError: (error: IApiError) => {
          if (error.status === 422) {
            const detail = error.detail?.toLowerCase() ?? ''
            if (detail.includes('already used') || detail.includes('already been used')) {
              setSubmitError('Este link já foi utilizado.')
            } else if (detail.includes('expired')) {
              setSubmitError('Este link expirou.')
            } else {
              setSubmitError('Não foi possível definir sua senha. Tente novamente.')
            }
          } else {
            setSubmitError('Não foi possível definir sua senha. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <div data-testid="set-password-page">
      {!token && (
        <Alert variant="error" data-testid="set-password-missing-token">
          Link inválido. Verifique o e-mail recebido.
        </Alert>
      )}

      {token && isLoading && (
        <div className="flex justify-center py-8" data-testid="set-password-validating">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      )}

      {token && !isLoading && validation && !validation.valid && (
        <Alert variant="error" data-testid="set-password-invalid-token">
          Este link já foi utilizado ou expirou. Solicite ao administrador um novo convite.
        </Alert>
      )}

      {token && !isLoading && validation?.valid && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-4">
            {submitError && (
              <Alert variant="error" data-testid="set-password-error">
                {submitError}
              </Alert>
            )}
            <Input
              label="Email"
              id="set-password-email"
              type="email"
              value={validation.email ?? ''}
              readOnly
              data-testid="set-password-email"
            />
            <Input
              label="Nova senha"
              id="set-password-password"
              type="password"
              autoComplete="new-password"
              data-testid="set-password-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmar senha"
              id="set-password-confirm-password"
              type="password"
              autoComplete="new-password"
              data-testid="set-password-confirm-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button
              type="submit"
              isLoading={isPending}
              disabled={isPending}
              data-testid="set-password-submit"
            >
              Definir senha
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
