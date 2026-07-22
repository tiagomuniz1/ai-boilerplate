'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { TemplateForm } from '@/components/features/medical-record-templates/components/template-form'
import { TemplateListSkeleton } from '@/components/features/medical-record-templates/components/template-list-skeleton'
import { useTemplate } from '@/components/features/medical-record-templates/hooks/use-template.hook'
import { useUpdateTemplate } from '@/components/features/medical-record-templates/hooks/use-update-template.hook'
import { useAuthStore } from '@/stores/auth.store'
import type { IUpdateTemplateInput } from '@/components/features/medical-record-templates/types/template-input.types'
import type { IApiError } from '@/types/api.types'

interface EditMedicalRecordTemplatePageProps {
  params: { id: string }
}

export default function EditMedicalRecordTemplatePage({ params }: EditMedicalRecordTemplatePageProps) {
  const basePath = useBasePath()
  const role = useAuthStore((state) => state.user?.role)
  const canEditTemplate = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL
  const { data: template, isPending: isLoadingTemplate, isError: isLoadError } = useTemplate(params.id)
  const { mutate, isPending: isSaving } = useUpdateTemplate(params.id)
  const [globalError, setGlobalError] = useState<string | null>(null)

  if (!canEditTemplate) {
    return (
      <main className="p-6 max-w-3xl" data-testid="edit-medical-record-template-page">
        <Alert variant="error" data-testid="edit-medical-record-template-page-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      </main>
    )
  }

  function handleSubmit(data: IUpdateTemplateInput) {
    setGlobalError(null)
    mutate(data, {
      onError: (error) => {
        const apiError = error as unknown as IApiError
        if (apiError.status === 409) {
          setGlobalError('Já existe um modelo com este nome para esta especialidade.')
        } else {
          setGlobalError('Não foi possível salvar o modelo. Tente novamente.')
        }
      },
    })
  }

  if (isLoadingTemplate) {
    return (
      <main className="p-6 max-w-3xl" data-testid="edit-medical-record-template-page">
        <TemplateListSkeleton />
      </main>
    )
  }

  if (isLoadError || !template) {
    return (
      <main className="p-6 max-w-3xl" data-testid="edit-medical-record-template-page">
        <Alert variant="error" data-testid="edit-template-load-error">
          Não foi possível carregar o modelo. Tente novamente.
        </Alert>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-3xl" data-testid="edit-medical-record-template-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/medical-record-templates/${params.id}`}>
          <Button variant="ghost" size="sm" data-testid="edit-template-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar modelo</Typography>
      </div>
      <TemplateForm
        mode="edit"
        template={template}
        specialtyId={template.specialtyId ?? undefined}
        isPending={isSaving}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
