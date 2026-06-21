'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import type { ITemplateModel } from '../types/template-model.types'

interface TemplateDeleteDialogProps {
  template: ITemplateModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function TemplateDeleteDialog({
  template,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: TemplateDeleteDialogProps) {
  if (!template) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir modelo"
      data-testid="template-delete-dialog"
    >
      <p className="text-sm text-text-dim mb-6">
        Deseja excluir o modelo <strong>"{template.name}"</strong>? Esta ação não pode ser desfeita.
      </p>
      <div className="flex gap-3 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          data-testid="template-delete-dialog-cancel"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          isLoading={isPending}
          disabled={isPending}
          data-testid="template-delete-dialog-confirm"
        >
          Excluir
        </Button>
      </div>
    </Modal>
  )
}
