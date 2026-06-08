'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { ClinicDetails } from '@/components/features/clinics/components/clinic-details'
import { ClinicDetailsSkeleton } from '@/components/features/clinics/components/clinic-details-skeleton'
import { useClinic } from '@/components/features/clinics/hooks/use-clinic.hook'

export default function ClinicDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: clinic, isPending, isError } = useClinic(id)

  return (
    <main className="max-w-2xl p-6" data-testid="clinic-details-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/clinics">
          <Button variant="ghost" size="sm" data-testid="clinic-details-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && <ClinicDetailsSkeleton />}

      {isError && (
        <Alert variant="error" data-testid="clinic-details-load-error">
          Não foi possível carregar os dados da clínica. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && clinic && <ClinicDetails clinic={clinic} />}
    </main>
  )
}
