'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { useDoctors } from '../hooks/use-doctors.hook'
import { useDeleteDoctor } from '../hooks/use-delete-doctor.hook'
import { DoctorListSkeleton } from './doctor-list-skeleton'
import { DoctorDeleteDialog } from './doctor-delete-dialog'
import type { IDoctorModel } from '../types/doctor-model.types'

export function DoctorList() {
  const slug = useSlug()
  const role = useAuthStore((s) => s.user?.role)
  const canCreate = role === UserRole.ADMIN
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [doctorToDelete, setDoctorToDelete] = useState<IDoctorModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: doctors, isPending, isError } = useDoctors(params)
  const { mutate: deleteDoctor, isPending: isDeleting } = useDeleteDoctor()

  function handleDeleteClick(doctor: IDoctorModel) {
    setDoctorToDelete(doctor)
  }

  function handleDeleteClose() {
    setDoctorToDelete(null)
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!doctorToDelete) return

    deleteDoctor(doctorToDelete.id, {
      onSuccess: () => {
        setDoctorToDelete(null)
        setSuccessMessage(`Médico ${doctorToDelete.user.fullName} excluído com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: () => {
        setDoctorToDelete(null)
      },
    })
  }

  const doctorCount = doctors?.length ?? 0

  return (
    <div className="flex flex-col gap-6" data-testid="doctor-list">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Médicos</h1>
          {!isPending && !isError && doctors && (
            <p className="mt-0.5 text-sm text-text-dim">
              {doctorCount === 1
                ? '1 médico cadastrado'
                : `${doctorCount} médicos cadastrados`}
            </p>
          )}
        </div>
        {canCreate && (
          <Link href={`/${slug}/doctors/new`}>
            <Button variant="primary" data-testid="doctor-list-new-button">
              + Novo médico
            </Button>
          </Link>
        )}
      </div>

      <Input
        label=""
        id="doctor-search"
        placeholder="Buscar por nome ou especialidade..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="doctor-list-search"
      />

      {successMessage && (
        <Alert variant="success" data-testid="doctor-list-success">
          {successMessage}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <DoctorListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="doctor-list-error">
              Não foi possível carregar a lista de médicos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && doctors && doctors.length === 0 && (
          <div className="py-16 text-center" data-testid="doctor-list-empty">
            <p className="text-sm text-text-dim">
              {debouncedSearch
                ? 'Nenhum médico encontrado para a busca realizada.'
                : 'Nenhum médico encontrado.'}
            </p>
          </div>
        )}

        {!isPending && !isError && doctors && doctors.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="doctor-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Médico
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    CRM
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Especialidade
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr
                    key={doctor.id}
                    data-testid={`doctor-table-row-${doctor.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <p
                        className="text-sm font-medium text-text"
                        data-testid={`doctor-name-${doctor.id}`}
                      >
                        {doctor.user.fullName}
                      </p>
                      <p
                        className="text-xs text-text-dim"
                        data-testid={`doctor-email-${doctor.id}`}
                      >
                        {doctor.user.email}
                      </p>
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim whitespace-nowrap"
                      data-testid={`doctor-crm-${doctor.id}`}
                    >
                      {doctor.crmNumber}
                    </td>
                    <td
                      className="px-6 py-4"
                      data-testid={`doctor-specialty-${doctor.id}`}
                    >
                      <div className="flex flex-wrap gap-1">
                        {doctor.specialties.slice(0, 2).map((s) => (
                          <span
                            key={s.id}
                            data-testid={`doctor-specialty-badge-${s.id}`}
                            className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                          >
                            {s.name}
                          </span>
                        ))}
                        {doctor.specialties.length > 2 && (
                          <span className="inline-flex items-center text-xs text-text-mute">
                            +{doctor.specialties.length - 2} mais
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(doctor)}
                          data-testid={`doctor-delete-button-${doctor.id}`}
                          className="text-xs text-danger hover:text-danger/80"
                        >
                          Excluir
                        </Button>
                        <Link
                          href={`/${slug}/doctors/${doctor.id}/edit`}
                          data-testid={`doctor-edit-link-${doctor.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/${slug}/doctors/${doctor.id}`}
                          data-testid={`doctor-view-link-${doctor.id}`}
                          className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
                          aria-label={`Ver detalhes de ${doctor.user.fullName}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DoctorDeleteDialog
        doctor={doctorToDelete}
        isOpen={doctorToDelete !== null}
        isPending={isDeleting}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
