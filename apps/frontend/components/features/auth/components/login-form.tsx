'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useLogin } from '../hooks/use-login.hook'
import { TurnstileWidget } from './turnstile-widget'
import type { IApiError } from '@/types/api.types'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

// The API distinguishes the 401 cases in `detail`; collapsing them all into
// "wrong password" leaves a user with a deactivated account retrying a password
// that was never the problem.
function loginErrorMessage(detail?: string): string {
  const reason = detail?.toLowerCase() ?? ''

  if (reason.includes('not active')) {
    return 'Esta conta está desativada. Fale com o administrador da clínica.'
  }
  if (reason.includes('not associated with a clinic')) {
    return 'Esta conta não está vinculada a nenhuma clínica.'
  }
  if (reason.includes('captcha')) {
    return 'Captcha inválido. Refaça a verificação e tente novamente.'
  }
  return 'Email ou senha inválidos'
}

export function LoginForm() {
  const { mutate, isPending } = useLogin()
  const [globalError, setGlobalError] = useState<string | null>(null)
  // Once required (from the 3rd failed attempt onward, per the backend), the
  // widget stays visible for the rest of this page load — the backend re-checks
  // the real counter on every submit regardless, so this is just UX continuity.
  const [requiresCaptcha, setRequiresCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const passwordSet = searchParams.get('passwordSet') === 'true'

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
    mutate(
      { ...data, captchaToken: captchaToken ?? undefined },
      {
        onError: (error: IApiError) => {
          if (error.requiresCaptcha) {
            setRequiresCaptcha(true)
            setCaptchaToken(null)
          }
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof FormValues, { message })
            })
          } else if (error.status === 401) {
            setGlobalError(loginErrorMessage(error.detail))
          } else {
            setGlobalError('Não foi possível fazer login. Tente novamente.')
          }
        },
      },
    )
  }

  const submitDisabled = isPending || (requiresCaptcha && !captchaToken)

  return (
    <form onSubmit={handleSubmit(onSubmit)} data-testid="login-form" noValidate>
      <div className="flex flex-col gap-4">
        {passwordSet && !globalError && (
          <Alert variant="success" data-testid="login-password-set-success">
            Senha definida com sucesso. Faça login para continuar.
          </Alert>
        )}
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
        {requiresCaptcha && <TurnstileWidget onVerify={setCaptchaToken} />}
        <Button
          type="submit"
          isLoading={isPending}
          disabled={submitDisabled}
          data-testid="login-submit"
        >
          Entrar
        </Button>
      </div>
    </form>
  )
}
