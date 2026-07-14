'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { MedicationForm } from '@/components/features/medications/components/medication-form'
import { useMedication } from '@/components/features/medications/hooks/use-medication.hook'
import { useUpdateMedication } from '@/components/features/medications/hooks/use-update-medication.hook'
import type { IUpdateMedicationInput } from '@/components/features/medications/types/medication-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditMedicationPage() {
  const { id } = useParams<{ id: string }>()
  const basePath = useBasePath()
  const { data: medication, isPending: isLoading, isError: isLoadError } = useMedication(id)
  const { mutate: updateMedication, isPending: isUpdating } = useUpdateMedication()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateMedicationInput,
    setError: (field: keyof IUpdateMedicationInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    setSuccessMessage(null)
    updateMedication(
      { id, data },
      {
        onSuccess: () => {
          setSuccessMessage('Medicamento atualizado com sucesso.')
        },
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field: f, message }) => {
              setError(f as keyof IUpdateMedicationInput, { message })
            })
          } else if (error.status === 404) {
            setGlobalError('Medicamento não encontrado.')
          } else {
            setGlobalError('Não foi possível atualizar o medicamento. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-medication-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/medications`}>
          <Button variant="ghost" size="sm" data-testid="edit-medication-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar medicamento</Typography>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4" data-testid="edit-medication-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-medication-load-error">
          Não foi possível carregar os dados do medicamento. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoading && !isLoadError && medication && (
        <div className="flex flex-col gap-4">
          {successMessage && (
            <Alert variant="success" data-testid="edit-medication-success">
              {successMessage}
            </Alert>
          )}
          <MedicationForm
            mode="edit"
            defaultValues={medication}
            isPending={isUpdating}
            globalError={globalError}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </main>
  )
}
