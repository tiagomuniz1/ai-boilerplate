'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { UserRole } from '@app/shared'
import { PatientDetails } from '@/components/features/patients/components/patient-details'
import { PatientDeleteDialog } from '@/components/features/patients/components/patient-delete-dialog'
import { usePatient } from '@/components/features/patients/hooks/use-patient.hook'
import { useDeletePatient } from '@/components/features/patients/hooks/use-delete-patient.hook'
import { PatientMedicalHistory } from '@/components/features/medical-records/components/patient-medical-history'
import { PatientPhotoGallery } from '@/components/features/consultation-photos/components/patient-photo-gallery'
import { useAuthStore } from '@/stores/auth.store'

export default function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const basePath = useBasePath()
  const { data: patient, isPending, isError } = usePatient(id)
  const { mutate: deletePatient, isPending: isDeleting } = useDeletePatient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const canSeeMedicalHistory =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PROFESSIONAL
  const canManagePatient = currentUser?.role === UserRole.ADMIN

  function handleDeleteConfirm() {
    deletePatient(id, {
      onSuccess: () => {
        router.push(`${basePath}/patients`)
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="patient-details-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/patients`}>
          <Button variant="ghost" size="sm" data-testid="patient-details-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="patient-details-skeleton">
          <Skeleton height={32} className="w-64" />
          <Skeleton height={16} className="w-48" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={40} className="w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="patient-details-error">
          Não foi possível carregar os dados do paciente. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && patient && (
        <>
          <PatientDetails
            patient={patient}
            canManage={canManagePatient}
            onDeleteClick={() => setShowDeleteDialog(true)}
          />
          {canSeeMedicalHistory && (
            <section className="mt-8">
              <h2 className="text-base font-semibold text-text mb-4" data-testid="patient-history-title">
                Histórico de Prontuários
              </h2>
              <PatientMedicalHistory patientId={id} />
            </section>
          )}
          {canSeeMedicalHistory && (
            <section className="mt-8">
              <h2 className="text-base font-semibold text-text mb-4" data-testid="patient-photos-title">
                Fotos de Evolução
              </h2>
              <PatientPhotoGallery patientId={id} />
            </section>
          )}
        </>
      )}

      <PatientDeleteDialog
        patient={patient ?? null}
        isOpen={showDeleteDialog}
        isPending={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
