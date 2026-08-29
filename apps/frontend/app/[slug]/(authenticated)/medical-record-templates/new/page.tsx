'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { TemplateForm } from '@/components/features/medical-record-templates/components/template-form'
import { useCreateTemplate } from '@/components/features/medical-record-templates/hooks/use-create-template.hook'
import { useAuthStore } from '@/stores/auth.store'
import type { ICreateTemplateInput } from '@/components/features/medical-record-templates/types/template-input.types'
import type { IApiError } from '@/types/api.types'

interface NewMedicalRecordTemplatePageProps {
  searchParams: { specialtyId?: string }
}

export default function NewMedicalRecordTemplatePage({ searchParams }: NewMedicalRecordTemplatePageProps) {
  const basePath = useBasePath()
  const role = useAuthStore((state) => state.user?.role)
  const canCreateTemplate = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL
  const specialtyId = searchParams.specialtyId ?? ''
  const { mutate, isPending } = useCreateTemplate()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(data: ICreateTemplateInput) {
    setGlobalError(null)
    mutate(data, {
      onError: (error) => {
        const apiError = error as unknown as IApiError
        if (apiError.status === 409) {
          // The rule is one template per specialty (or per profession, for the
          // generalist one) — never per name. Saying "name" sends the user off to
          // rename the template, which cannot resolve the conflict.
          setGlobalError(
            data.specialtyId
              ? 'Esta clínica já tem um modelo para esta especialidade. É permitido apenas um.'
              : 'Esta clínica já tem um modelo generalista para esta profissão. É permitido apenas um.',
          )
        } else {
          setGlobalError('Não foi possível criar o modelo. Tente novamente.')
        }
      },
    })
  }

  if (!canCreateTemplate) {
    return (
      <main className="p-6 max-w-3xl" data-testid="new-medical-record-template-page">
        <Alert variant="error" data-testid="new-medical-record-template-page-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-3xl" data-testid="new-medical-record-template-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/medical-record-templates`}>
          <Button variant="ghost" size="sm" data-testid="new-template-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo modelo de prontuário</Typography>
      </div>
      <TemplateForm
        mode="create"
        specialtyId={specialtyId}
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
