'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { PatientGender } from '@app/shared'
import { formatPhone } from '@/lib/format-phone'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { usePatients } from '../hooks/use-patients.hook'
import { useDeletePatient } from '../hooks/use-delete-patient.hook'
import { PatientListSkeleton } from './patient-list-skeleton'
import { PatientDeleteDialog } from './patient-delete-dialog'
import type { IPatientModel } from '../types/patient-model.types'

const genderLabel: Record<PatientGender, string> = {
  [PatientGender.MALE]: 'Masculino',
  [PatientGender.FEMALE]: 'Feminino',
  [PatientGender.OTHER]: 'Outro',
}

export function PatientList() {
  const slug = useSlug()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [patientToDelete, setPatientToDelete] = useState<IPatientModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: patients, isPending, isError } = usePatients(params)
  const { mutate: deletePatient, isPending: isDeleting } = useDeletePatient()

  function handleDeleteClick(patient: IPatientModel) {
    setPatientToDelete(patient)
  }

  function handleDeleteClose() {
    setPatientToDelete(null)
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!patientToDelete) return

    deletePatient(patientToDelete.id, {
      onSuccess: () => {
        setPatientToDelete(null)
        setSuccessMessage(`Paciente ${patientToDelete.fullName} excluído com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: () => {
        setPatientToDelete(null)
      },
    })
  }

  const patientCount = patients?.length ?? 0

  return (
    <div className="flex flex-col gap-6" data-testid="patient-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pacientes</h1>
          {!isPending && !isError && patients && (
            <p className="mt-0.5 text-sm text-text-dim">
              {patientCount === 1
                ? '1 paciente cadastrado'
                : `${patientCount} pacientes cadastrados`}
            </p>
          )}
        </div>
        <Link href={`/${slug}/patients/new`} className="block sm:inline-block">
          <Button variant="primary" data-testid="patient-list-new-button" className="w-full sm:w-auto">
            + Novo paciente
          </Button>
        </Link>
      </div>

      <Input
        label=""
        id="patient-search"
        placeholder="Buscar por nome..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="patient-list-search"
      />

      {successMessage && (
        <Alert variant="success" data-testid="patient-list-success">
          {successMessage}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <PatientListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="patient-list-error">
              Não foi possível carregar a lista de pacientes. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && patients && patients.length === 0 && (
          <div className="py-16 text-center" data-testid="patient-list-empty">
            <p className="text-sm text-text-dim">
              {debouncedSearch
                ? 'Nenhum paciente encontrado para a busca realizada.'
                : 'Nenhum paciente encontrado.'}
            </p>
          </div>
        )}

        {!isPending && !isError && patients && patients.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="patient-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nascimento
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute lg:table-cell">
                    Gênero
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    data-testid={`patient-table-row-${patient.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <p
                        className="text-sm font-medium text-text"
                        data-testid={`patient-name-${patient.id}`}
                      >
                        {patient.fullName}
                      </p>
                      <p
                        className="text-xs text-text-dim"
                        data-testid={`patient-email-${patient.id}`}
                      >
                        {patient.email}
                      </p>
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim whitespace-nowrap"
                      data-testid={`patient-phone-${patient.id}`}
                    >
                      {formatPhone(patient.phoneNumber)}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim whitespace-nowrap"
                      data-testid={`patient-birthdate-${patient.id}`}
                    >
                      {patient.birthDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td
                      className="hidden px-6 py-4 text-sm text-text-dim lg:table-cell"
                      data-testid={`patient-gender-${patient.id}`}
                    >
                      {genderLabel[patient.gender]}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(patient)}
                          data-testid={`patient-delete-button-${patient.id}`}
                          className="text-xs text-danger hover:text-danger/80"
                        >
                          Excluir
                        </Button>
                        <Link
                          href={`/${slug}/patients/${patient.id}/edit`}
                          data-testid={`patient-edit-link-${patient.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/${slug}/patients/${patient.id}`}
                          data-testid={`patient-view-link-${patient.id}`}
                          className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
                          aria-label={`Ver detalhes de ${patient.fullName}`}
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

        {!isPending && !isError && patients && patients.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="patient-list-cards">
            {patients.map((patient) => (
              <MobileListCard
                key={patient.id}
                data-testid={`patient-card-${patient.id}`}
                title={
                  <span className="block">
                    <span className="block">{patient.fullName}</span>
                    <span className="block text-xs font-normal text-text-dim">{patient.email}</span>
                  </span>
                }
                rows={[
                  { label: 'Telefone', value: formatPhone(patient.phoneNumber) },
                  {
                    label: 'Nascimento',
                    value: patient.birthDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }),
                  },
                  { label: 'Gênero', value: genderLabel[patient.gender] },
                ]}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(patient)}
                      data-testid={`patient-card-delete-button-${patient.id}`}
                      className="text-xs text-danger hover:text-danger/80"
                    >
                      Excluir
                    </Button>
                    <Link
                      href={`/${slug}/patients/${patient.id}/edit`}
                      data-testid={`patient-card-edit-link-${patient.id}`}
                      className="text-xs text-text-mute hover:text-text transition-colors"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/${slug}/patients/${patient.id}`}
                      data-testid={`patient-card-view-link-${patient.id}`}
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

      <PatientDeleteDialog
        patient={patientToDelete}
        isOpen={patientToDelete !== null}
        isPending={isDeleting}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
