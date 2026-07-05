'use client'

import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { PatientList } from '@/components/features/patients/components/patient-list'
import { useAuthStore } from '@/stores/auth.store'

export default function PatientsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canViewPatientList = role === UserRole.ADMIN || role === UserRole.USER

  return (
    <main className="p-6 sm:p-8" data-testid="patients-page">
      {canViewPatientList ? (
        <PatientList />
      ) : (
        <Alert variant="error" data-testid="patients-page-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      )}
    </main>
  )
}
