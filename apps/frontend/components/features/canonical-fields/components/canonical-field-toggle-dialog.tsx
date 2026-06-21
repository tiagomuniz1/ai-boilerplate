'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

interface CanonicalFieldToggleDialogProps {
  field: ICanonicalFieldModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CanonicalFieldToggleDialog({
  field,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: CanonicalFieldToggleDialogProps) {
  if (!field) return null

  const isDeactivating = field.isActive

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeactivating ? 'Desativar campo' : 'Ativar campo'}
      data-testid="canonical-field-toggle-dialog"
    >
      <p className="text-sm text-text-dim mb-6">
        {isDeactivating
          ? `Deseja desativar o campo "${field.label}" (${field.canonicalKey})? Ele não aparecerá como sugestão em novos templates.`
          : `Deseja ativar o campo "${field.label}" (${field.canonicalKey})?`}
      </p>
      <div className="flex gap-3 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          data-testid="canonical-field-toggle-dialog-cancel"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          isLoading={isPending}
          disabled={isPending}
          data-testid="canonical-field-toggle-dialog-confirm"
        >
          {isDeactivating ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
    </Modal>
  )
}
