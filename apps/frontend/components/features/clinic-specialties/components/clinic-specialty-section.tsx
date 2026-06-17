'use client'

import { useState, useEffect } from 'react'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { useSpecialties } from '@/components/features/specialties/hooks/use-specialties.hook'
import { useClinicSpecialties } from '../hooks/use-clinic-specialties.hook'
import { useLinkSpecialty } from '../hooks/use-link-specialty.hook'
import { useUnlinkSpecialty } from '../hooks/use-unlink-specialty.hook'
import type { IApiError } from '@/types/api.types'
import type { IClinicSpecialtyModel } from '../types/clinic-specialty.types'

interface ClinicSpecialtySectionProps {
  clinicId: string
}

export function ClinicSpecialtySection({ clinicId }: ClinicSpecialtySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSearch, setModalSearch] = useState('')
  const [debouncedModalSearch, setDebouncedModalSearch] = useState('')
  const [specialtyToUnlink, setSpecialtyToUnlink] = useState<IClinicSpecialtyModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedModalSearch(modalSearch), 300)
    return () => clearTimeout(timer)
  }, [modalSearch])

  const { data: linkedPage, isPending: isLoadingLinked, isError: isErrorLinked } = useClinicSpecialties(clinicId)
  const { data: allSpecialtiesPage } = useSpecialties({ limit: 100, search: debouncedModalSearch })
  const { mutate: linkSpecialty, isPending: isLinking } = useLinkSpecialty(clinicId)
  const { mutate: unlinkSpecialty, isPending: isUnlinking } = useUnlinkSpecialty(clinicId)

  const linkedSpecialties = linkedPage?.data ?? []
  const linkedSpecialtyIds = new Set(linkedSpecialties.map((s) => s.specialtyId))
  const filteredAvailable = (allSpecialtiesPage?.data ?? []).filter(
    (s) => !linkedSpecialtyIds.has(s.id),
  )

  function handleOpenModal() {
    setModalSearch('')
    setDebouncedModalSearch('')
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
  }

  function handleLink(specialtyId: string, specialtyName: string) {
    linkSpecialty(specialtyId, {
      onSuccess: () => {
        handleCloseModal()
        setSuccessMessage(`Especialidade "${specialtyName}" vinculada com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: (error: IApiError) => {
        handleCloseModal()
        if (error.status === 409) {
          setErrorMessage(`A especialidade "${specialtyName}" já está vinculada a esta clínica.`)
        } else {
          setErrorMessage('Não foi possível vincular a especialidade. Tente novamente.')
        }
        setTimeout(() => setErrorMessage(null), 6000)
      },
    })
  }

  function handleUnlinkClick(specialty: IClinicSpecialtyModel) {
    setSpecialtyToUnlink(specialty)
  }

  function handleUnlinkClose() {
    setSpecialtyToUnlink(null)
  }

  function handleUnlinkConfirm() {
    /* c8 ignore next */
    if (!specialtyToUnlink) return

    const name = specialtyToUnlink.name
    unlinkSpecialty(specialtyToUnlink.specialtyId, {
      onSuccess: () => {
        setSpecialtyToUnlink(null)
        setSuccessMessage(`Especialidade "${name}" desvinculada com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: () => {
        setSpecialtyToUnlink(null)
        setErrorMessage('Não foi possível desvincular a especialidade. Tente novamente.')
        setTimeout(() => setErrorMessage(null), 6000)
      },
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm" data-testid="clinic-specialty-section">
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
          Especialidades
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenModal}
          data-testid="clinic-specialty-link-button"
        >
          + Vincular
        </Button>
      </div>

      <div className="px-6 py-4 flex flex-col gap-4">
        {successMessage && (
          <Alert variant="success" data-testid="clinic-specialty-success">
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" data-testid="clinic-specialty-error">
            {errorMessage}
          </Alert>
        )}

        {isLoadingLinked && (
          <p className="text-sm text-text-dim" data-testid="clinic-specialty-loading">
            Carregando especialidades...
          </p>
        )}

        {isErrorLinked && (
          <Alert variant="error" data-testid="clinic-specialty-list-error">
            Não foi possível carregar as especialidades vinculadas.
          </Alert>
        )}

        {!isLoadingLinked && !isErrorLinked && linkedSpecialties.length === 0 && (
          <p className="text-sm text-text-dim" data-testid="clinic-specialty-empty">
            Nenhuma especialidade vinculada.
          </p>
        )}

        {!isLoadingLinked && !isErrorLinked && linkedSpecialties.length > 0 && (
          <div className="overflow-x-auto" data-testid="clinic-specialty-table-wrapper">
            <table className="w-full text-left" data-testid="clinic-specialty-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nome
                  </th>
                  <th className="pb-2 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Descrição
                  </th>
                  <th className="pb-2 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Vinculada em
                  </th>
                  <th className="pb-2 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {linkedSpecialties.map((specialty) => (
                  <tr
                    key={specialty.id}
                    data-testid={`clinic-specialty-row-${specialty.specialtyId}`}
                    className="border-b border-line last:border-0"
                  >
                    <td
                      className="py-3 pr-4 text-sm font-medium text-text"
                      data-testid={`clinic-specialty-name-${specialty.specialtyId}`}
                    >
                      {specialty.name}
                    </td>
                    <td
                      className="py-3 pr-4 text-sm text-text-dim max-w-xs truncate"
                      data-testid={`clinic-specialty-description-${specialty.specialtyId}`}
                    >
                      {specialty.description ?? '—'}
                    </td>
                    <td
                      className="py-3 pr-4 text-sm text-text-dim whitespace-nowrap"
                      data-testid={`clinic-specialty-linked-at-${specialty.specialtyId}`}
                    >
                      {specialty.linkedAt.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkClick(specialty)}
                        data-testid={`clinic-specialty-unlink-button-${specialty.specialtyId}`}
                        className="text-xs text-danger hover:text-danger/80"
                      >
                        Desvincular
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Vincular especialidade"
        data-testid="clinic-specialty-link-modal"
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            label=""
            id="modal-specialty-search"
            placeholder="Buscar especialidade..."
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            data-testid="clinic-specialty-modal-search"
          />

          {filteredAvailable.length === 0 && (
            <p className="py-4 text-center text-sm text-text-dim" data-testid="clinic-specialty-modal-empty">
              {debouncedModalSearch
                ? 'Nenhuma especialidade encontrada.'
                : 'Todas as especialidades já estão vinculadas.'}
            </p>
          )}

          {filteredAvailable.length > 0 && (
            <ul
              className="max-h-64 overflow-y-auto divide-y divide-line rounded-lg border border-line"
              data-testid="clinic-specialty-modal-list"
            >
              {filteredAvailable.map((specialty) => (
                <li
                  key={specialty.id}
                  className="flex items-center justify-between px-4 py-3"
                  data-testid={`clinic-specialty-modal-item-${specialty.id}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text">{specialty.name}</span>
                    {specialty.description && (
                      <span className="text-xs text-text-dim truncate max-w-xs">
                        {specialty.description}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLink(specialty.id, specialty.name)}
                    disabled={isLinking}
                    data-testid={`clinic-specialty-modal-link-button-${specialty.id}`}
                  >
                    Vincular
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={specialtyToUnlink !== null}
        onClose={handleUnlinkClose}
        title="Desvincular especialidade"
        data-testid="clinic-specialty-unlink-modal"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text" data-testid="clinic-specialty-unlink-message">
            Tem certeza que deseja desvincular a especialidade{' '}
            <strong>{specialtyToUnlink?.name}</strong> desta clínica?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={handleUnlinkClose}
              disabled={isUnlinking}
              data-testid="clinic-specialty-unlink-cancel"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleUnlinkConfirm}
              isLoading={isUnlinking}
              disabled={isUnlinking}
              data-testid="clinic-specialty-unlink-confirm"
              className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
            >
              Desvincular
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
