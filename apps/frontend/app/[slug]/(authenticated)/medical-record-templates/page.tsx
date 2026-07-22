'use client'

import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { TemplateList } from '@/components/features/medical-record-templates/components/template-list'
import { useAuthStore } from '@/stores/auth.store'

export default function MedicalRecordTemplatesPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canViewTemplateList = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL

  return (
    <main className="p-6 sm:p-8" data-testid="medical-record-templates-page">
      {canViewTemplateList ? (
        <TemplateList />
      ) : (
        <Alert variant="error" data-testid="medical-record-templates-page-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      )}
    </main>
  )
}
