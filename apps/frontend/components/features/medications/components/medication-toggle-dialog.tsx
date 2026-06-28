'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import type { IMedicationModel } from '../types/medication-model.types'

interface MedicationToggleDialogProps {
  medication: IMedicationModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function MedicationToggleDialog({
  medication,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: MedicationToggleDialogProps) {
  if (!medication) return null

  const isDeactivating = medication.isActive

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeactivating ? 'Desativar medicamento' : 'Ativar medicamento'}
      data-testid="medication-toggle-dialog"
    >
      <p className="text-sm text-text-dim mb-6">
        {isDeactivating
          ? `Deseja desativar "${medication.name}"? Ele deixará de aparecer para os médicos ao prescrever.`
          : `Deseja ativar "${medication.name}"?`}
      </p>
      <div className="flex gap-3 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          data-testid="medication-toggle-dialog-cancel"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          isLoading={isPending}
          disabled={isPending}
          data-testid="medication-toggle-dialog-confirm"
        >
          {isDeactivating ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
    </Modal>
  )
}
