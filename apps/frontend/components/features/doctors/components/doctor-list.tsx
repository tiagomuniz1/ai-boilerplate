'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useDoctors } from '../hooks/use-doctors.hook'
import { useDeleteDoctor } from '../hooks/use-delete-doctor.hook'
import { DoctorListSkeleton } from './doctor-list-skeleton'
import { DoctorDeleteDialog } from './doctor-delete-dialog'
import type { IDoctorCrmModel, IDoctorModel } from '../types/doctor-model.types'

function primaryCrmLabel(crms: IDoctorCrmModel[]): string {
  if (crms.length === 0) return '—'
  const primary = crms.find((crm) => crm.isPrimary) ?? crms[0]
  const suffix = crms.length > 1 ? ` +${crms.length - 1}` : ''
  return `${primary.number}/${primary.state}${suffix}`
}

export function DoctorList() {
  const slug = useSlug()
  const role = useAuthStore((s) => s.user?.role)
  const canCreate = role === UserRole.ADMIN
  const canViewAppointments =
    role === UserRole.ADMIN || role === UserRole.DOCTOR || role === UserRole.USER
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <Link href={`/${slug}/doctors/new`} className="block sm:inline-block">
            <Button variant="primary" data-testid="doctor-list-new-button" className="w-full sm:w-auto">
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
          <div className="hidden overflow-x-auto md:block">
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
                      {primaryCrmLabel(doctor.crms)}
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
                        {canViewAppointments && (
                          <Link
                            href={`/${slug}/appointments?doctor=${doctor.id}`}
                            data-testid={`doctor-appointments-link-${doctor.id}`}
                            className="text-xs text-text-mute hover:text-text transition-colors"
                          >
                            Consultas
                          </Link>
                        )}
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

        {!isPending && !isError && doctors && doctors.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="doctor-list-cards">
            {doctors.map((doctor) => (
              <MobileListCard
                key={doctor.id}
                data-testid={`doctor-card-${doctor.id}`}
                title={
                  <span className="block">
                    <span className="block">{doctor.user.fullName}</span>
                    <span className="block text-xs font-normal text-text-dim">{doctor.user.email}</span>
                  </span>
                }
                rows={[
                  { label: 'CRM', value: primaryCrmLabel(doctor.crms) },
                  {
                    label: 'Especialidade',
                    value: (
                      <span className="flex flex-wrap justify-end gap-1">
                        {doctor.specialties.slice(0, 2).map((s) => (
                          <span
                            key={s.id}
                            data-testid={`doctor-card-specialty-badge-${s.id}`}
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
                        {doctor.specialties.length === 0 && <span className="text-xs text-text-mute">—</span>}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(doctor)}
                      data-testid={`doctor-card-delete-button-${doctor.id}`}
                      className="text-xs text-danger hover:text-danger/80"
                    >
                      Excluir
                    </Button>
                    <Link
                      href={`/${slug}/doctors/${doctor.id}/edit`}
                      data-testid={`doctor-card-edit-link-${doctor.id}`}
                      className="text-xs text-text-mute hover:text-text transition-colors"
                    >
                      Editar
                    </Link>
                    {canViewAppointments && (
                      <Link
                        href={`/${slug}/appointments?doctor=${doctor.id}`}
                        data-testid={`doctor-card-appointments-link-${doctor.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        Consultas
                      </Link>
                    )}
                    <Link
                      href={`/${slug}/doctors/${doctor.id}`}
                      data-testid={`doctor-card-view-link-${doctor.id}`}
                      className="ml-auto flex items-center gap-1 text-xs text-text-mute transition-colors hover:text-text"
                    >
                      Ver detalhes
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </>
                }
              />
            ))}
          </ul>
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
