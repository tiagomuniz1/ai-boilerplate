'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { usePatient } from '@/components/features/patients/hooks/use-patient.hook'
import { PatientAppointmentHistory } from '@/components/features/appointments/components/patient-appointment-history'
import { useAuthStore } from '@/stores/auth.store'

export default function PatientAppointmentsPage() {
  const { id } = useParams<{ id: string }>()
  const basePath = useBasePath()
  const role = useAuthStore((state) => state.user?.role)

  // Os três perfis que leem consultas (appointments.controller.ts:120). O
  // PROFESSIONAL recebe apenas as próprias — o recorte é do backend, não desta
  // tela, e ele chega aqui pelo link na consulta, já que não acessa a lista de
  // pacientes.
  const canViewAppointments =
    role === UserRole.ADMIN || role === UserRole.USER || role === UserRole.PROFESSIONAL

  const { data: patient, isPending, isError } = usePatient(id)

  if (!canViewAppointments) {
    return (
      <main className="p-6 sm:p-8" data-testid="patient-appointments-page">
        <Alert variant="error" data-testid="patient-appointments-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      </main>
    )
  }

  return (
    <main className="p-6 sm:p-8" data-testid="patient-appointments-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`${basePath}/patients/${id}`}>
          <Button variant="ghost" size="sm" data-testid="patient-appointments-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex flex-col gap-3" data-testid="patient-appointments-skeleton">
          <Skeleton height={32} className="w-64" />
          <Skeleton height={16} className="w-48" />
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="patient-appointments-patient-error">
          Não foi possível carregar os dados do paciente. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && patient && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text" data-testid="patient-appointments-title">
              Consultas de {patient.fullName}
            </h1>
            <p className="mt-0.5 text-sm text-text-dim">
              Da mais recente para a mais antiga.
            </p>
          </div>

          <PatientAppointmentHistory patientId={id} />
        </>
      )}
    </main>
  )
}
