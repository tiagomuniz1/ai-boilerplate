'use client'

import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { TemplateDetails } from '@/components/features/medical-record-templates/components/template-details'
import { useAuthStore } from '@/stores/auth.store'

interface MedicalRecordTemplateDetailsPageProps {
  params: { id: string }
}

export default function MedicalRecordTemplateDetailsPage({ params }: MedicalRecordTemplateDetailsPageProps) {
  const role = useAuthStore((state) => state.user?.role)
  const canViewTemplate = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL

  return (
    <main className="p-6 sm:p-8" data-testid="medical-record-template-details-page">
      {canViewTemplate ? (
        <TemplateDetails templateId={params.id} />
      ) : (
        <Alert variant="error" data-testid="medical-record-template-details-page-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      )}
    </main>
  )
}
