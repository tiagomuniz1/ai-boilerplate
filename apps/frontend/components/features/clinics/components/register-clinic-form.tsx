'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useRegisterClinic } from '../hooks/use-register-clinic.hook'
import type { IRegisterClinicInput } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const schema = z
  .object({
    clinicName: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
    slug: z
      .string()
      .regex(slugRegex, 'Slug inválido. Use letras minúsculas, números e hífens (ex: minha-clinica)')
      .min(3, 'Slug deve ter ao menos 3 caracteres')
      .max(80, 'Slug deve ter no máximo 80 caracteres')
      .optional()
      .or(z.literal('')),
    adminFullName: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
    adminEmail: z.string().email('E-mail inválido'),
    adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    adminPasswordConfirm: z.string().min(1, 'Confirme a senha'),
  })
  .superRefine(({ adminPassword, adminPasswordConfirm }, ctx) => {
    if (adminPassword !== adminPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'As senhas não coincidem',
        path: ['adminPasswordConfirm'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function RegisterClinicForm() {
  const { mutate, isPending } = useRegisterClinic()
  const [succeeded, setSucceeded] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { clinicName: '', slug: '', adminFullName: '', adminEmail: '', adminPassword: '', adminPasswordConfirm: '' },
  })

  const clinicNameValue = watch('clinicName')
  const slugValue = watch('slug')
  const slugPreview = slugValue ? slugValue : generateSlug(clinicNameValue || '')

  function onSubmit(data: FormValues) {
    const input: IRegisterClinicInput = {
      clinicName: data.clinicName,
      slug: data.slug || undefined,
      adminFullName: data.adminFullName,
      adminEmail: data.adminEmail,
      adminPassword: data.adminPassword,
      adminPasswordConfirm: data.adminPasswordConfirm,
    }

    mutate(input, {
      onSuccess: () => {
        setSucceeded(true)
      },
      onError: (error: IApiError) => {
        if (error.status === 409) {
          if (error.detail?.toLowerCase().includes('slug')) {
            setError('slug', { message: 'Este endereço já está em uso' })
          } else if (error.detail?.toLowerCase().includes('email')) {
            setError('adminEmail', { message: 'Este e-mail já está cadastrado' })
          }
        }
      },
    })
  }

  if (succeeded) {
    return (
      <div className="flex flex-col gap-6" data-testid="register-clinic-success">
        <Alert variant="success" data-testid="register-clinic-success-message">
          Clínica criada com sucesso! Agora você pode fazer login com as credenciais do administrador.
        </Alert>
        <Link href="/login">
          <Button variant="primary" data-testid="register-clinic-login-link" className="w-full">
            Ir para o login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} data-testid="register-clinic-form" noValidate>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-text" data-testid="register-section-clinic">
            Dados da clínica
          </h2>

          <Input
            label="Nome da clínica"
            id="clinicName"
            placeholder="Clínica do Coração"
            data-testid="register-clinic-name"
            error={errors.clinicName?.message}
            {...register('clinicName')}
          />

          <div className="flex flex-col gap-1.5">
            <Input
              label="Endereço (slug)"
              id="slug"
              placeholder="clinica-do-coracao"
              data-testid="register-clinic-slug"
              error={errors.slug?.message}
              {...register('slug')}
            />
            {slugPreview && (
              <p className="text-xs text-text-mute" data-testid="register-clinic-slug-preview">
                Preview: <span className="font-mono">{slugPreview}</span>
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-text" data-testid="register-section-admin">
              Dados do administrador
            </h2>

            <Input
              label="Nome completo"
              id="adminFullName"
              placeholder="Ana Silva"
              data-testid="register-admin-fullname"
              error={errors.adminFullName?.message}
              {...register('adminFullName')}
            />

            <Input
              label="E-mail"
              id="adminEmail"
              type="email"
              autoComplete="email"
              placeholder="admin@clinica.com"
              data-testid="register-admin-email"
              error={errors.adminEmail?.message}
              {...register('adminEmail')}
            />

            <Input
              label="Senha"
              id="adminPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              data-testid="register-admin-password"
              error={errors.adminPassword?.message}
              {...register('adminPassword')}
            />

            <Input
              label="Confirmar senha"
              id="adminPasswordConfirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              data-testid="register-admin-password-confirm"
              error={errors.adminPasswordConfirm?.message}
              {...register('adminPasswordConfirm')}
            />
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="register-clinic-submit"
        >
          {isPending ? 'Criando clínica...' : 'Criar clínica'}
        </Button>
      </div>
    </form>
  )
}
