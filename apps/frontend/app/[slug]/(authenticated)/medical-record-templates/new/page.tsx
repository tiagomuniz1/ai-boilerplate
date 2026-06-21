'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { TemplateForm } from '@/components/features/medical-record-templates/components/template-form'
import { useCreateTemplate } from '@/components/features/medical-record-templates/hooks/use-create-template.hook'
import type { ICreateTemplateInput } from '@/components/features/medical-record-templates/types/template-input.types'
import type { IApiError } from '@/types/api.types'

interface NewMedicalRecordTemplatePageProps {
  searchParams: { specialtyId?: string }
}

export default function NewMedicalRecordTemplatePage({ searchParams }: NewMedicalRecordTemplatePageProps) {
  const slug = useSlug()
  const specialtyId = searchParams.specialtyId ?? ''
  const { mutate, isPending } = useCreateTemplate()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(data: ICreateTemplateInput) {
    setGlobalError(null)
    mutate(data, {
      onError: (error) => {
        const apiError = error as unknown as IApiError
        if (apiError.status === 409) {
          setGlobalError('Já existe um modelo com este nome para esta especialidade.')
        } else {
          setGlobalError('Não foi possível criar o modelo. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-3xl" data-testid="new-medical-record-template-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${slug}/medical-record-templates`}>
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
