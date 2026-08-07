'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useReassignCandidates } from '../hooks/use-reassign-candidates.hook'

interface ReassignProfessionalDialogProps {
  isOpen: boolean
  appointmentId: string
  isPending: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: (professionalId: string) => void
}

export function ReassignProfessionalDialog({
  isOpen,
  appointmentId,
  isPending,
  errorMessage,
  onClose,
  onConfirm,
}: ReassignProfessionalDialogProps) {
  const { data: candidates, isLoading, isError } = useReassignCandidates(appointmentId, isOpen)
  const [selectedId, setSelectedId] = useState('')

  function handleConfirm() {
    if (selectedId) onConfirm(selectedId)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trocar profissional"
      data-testid="reassign-professional-dialog"
    >
      <div className="space-y-4">
        <p className="text-sm text-text/70">
          Selecione um profissional da mesma especialidade ou profissão que esteja disponível neste
          mesmo horário. A data e o horário da consulta são mantidos.
        </p>

        {isLoading && (
          <div data-testid="reassign-loading" className="py-4 text-center text-sm text-text/50">
            Carregando profissionais...
          </div>
        )}

        {isError && (
          <Alert variant="error" data-testid="reassign-error">
            Erro ao carregar os profissionais disponíveis.
          </Alert>
        )}

        {!isLoading && !isError && candidates && candidates.length === 0 && (
          <Alert variant="warning" data-testid="reassign-empty">
            Nenhum profissional disponível para este horário.
          </Alert>
        )}

        {!isLoading && !isError && candidates && candidates.length > 0 && (
          <div>
            <label htmlFor="reassign-professional" className="block text-sm font-medium mb-1">
              Profissional
            </label>
            <select
              id="reassign-professional"
              data-testid="reassign-professional-select"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Selecione um profissional</option>
              {candidates.map((candidate) => (
                <option key={candidate.professionalId} value={candidate.professionalId}>
                  {candidate.professionalName}
                  {candidate.specialtyName ? ` — ${candidate.specialtyName}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {errorMessage && (
          <Alert variant="error" data-testid="reassign-submit-error">
            {errorMessage}
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="reassign-dialog-cancel"
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            isLoading={isPending}
            disabled={isPending || !selectedId}
            data-testid="reassign-dialog-confirm"
          >
            Trocar profissional
          </Button>
        </div>
      </div>
    </Modal>
  )
}
