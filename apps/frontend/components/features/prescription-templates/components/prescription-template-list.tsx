'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { usePrescriptionTemplates } from '../hooks/use-prescription-templates.hook'
import { useCreatePrescriptionTemplate } from '../hooks/use-create-prescription-template.hook'
import { useUpdatePrescriptionTemplate } from '../hooks/use-update-prescription-template.hook'
import { useDeletePrescriptionTemplate } from '../hooks/use-delete-prescription-template.hook'
import { PrescriptionTemplateListSkeleton } from './prescription-template-list-skeleton'
import { PrescriptionTemplateForm } from './prescription-template-form'
import { PrescriptionTemplateDeleteDialog } from './prescription-template-delete-dialog'
import type { IPrescriptionTemplateModel } from '../types/prescription-template-model.types'
import type { ICreatePrescriptionTemplateInput } from '../types/prescription-template-input.types'
import type { IApiError } from '@/types/api.types'

export function PrescriptionTemplateList() {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === UserRole.ADMIN
  const isDoctor = role === UserRole.PROFESSIONAL

  const { data: templates, isPending, isError } = usePrescriptionTemplates()

  const createMutation = useCreatePrescriptionTemplate()
  const updateMutation = useUpdatePrescriptionTemplate()
  const deleteMutation = useDeletePrescriptionTemplate()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<IPrescriptionTemplateModel | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  function handleCreate(input: ICreatePrescriptionTemplateInput) {
    setCreateError(null)
    createMutation.mutate(input, {
      onSuccess: () => {
        setIsCreateOpen(false)
      },
      onError: (error) => {
        const apiError = error as unknown as IApiError
        setCreateError(apiError.detail ?? 'Erro ao criar modelo. Tente novamente.')
      },
    })
  }

  function handleUpdate(input: ICreatePrescriptionTemplateInput) {
    // Only reachable while the edit modal is open, which requires editingTemplate to be set.
    setEditError(null)
    updateMutation.mutate(
      { id: editingTemplate!.id, data: input },
      {
        onSuccess: () => {
          setEditingTemplate(null)
        },
        onError: (error) => {
          const apiError = error as unknown as IApiError
          setEditError(apiError.detail ?? 'Erro ao atualizar modelo. Tente novamente.')
        },
      },
    )
  }

  function handleDelete() {
    // Only reachable while the delete dialog is open, which requires deletingId to be set
    // (PrescriptionTemplateDeleteDialog's isOpen is `!!deletingId`).
    deleteMutation.mutate(deletingId!, {
      onSuccess: () => setDeletingId(null),
    })
  }

  return (
    <div className="flex flex-col gap-6" data-testid="prescription-template-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Modelos de receita</h1>
          {!isPending && !isError && templates && (
            <p className="mt-0.5 text-sm text-text-dim">
              {templates.length === 1
                ? '1 modelo cadastrado'
                : `${templates.length} modelos cadastrados`}
            </p>
          )}
        </div>
        {isDoctor && (
          <Button
            variant="primary"
            onClick={() => { setCreateError(null); setIsCreateOpen(true) }}
            data-testid="prescription-template-list-new-button"
            className="w-full sm:w-auto"
          >
            + Novo modelo
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <PrescriptionTemplateListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="prescription-template-list-error">
              Não foi possível carregar a lista de modelos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && (!templates || templates.length === 0) && (
          <div className="py-16 text-center" data-testid="prescription-template-list-empty">
            <p className="text-sm text-text-dim">Nenhum modelo de receita cadastrado.</p>
          </div>
        )}

        {!isPending && !isError && templates && templates.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="prescription-template-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nome
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                      Médico
                    </th>
                  )}
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Medicamentos
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-line last:border-0 hover:bg-surface-raised"
                    data-testid={`prescription-template-row-${template.id}`}
                  >
                    <td
                      className="px-6 py-4 text-sm font-medium text-text"
                      data-testid={`prescription-template-name-${template.id}`}
                    >
                      {template.name}
                    </td>
                    {isAdmin && (
                      <td
                        className="px-6 py-4 text-sm text-text-dim"
                        data-testid={`prescription-template-doctor-${template.id}`}
                      >
                        {template.doctorName}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-text-dim">
                      {template.items.length === 1
                        ? '1 medicamento'
                        : `${template.items.length} medicamentos`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isDoctor && (
                          <button
                            type="button"
                            onClick={() => { setEditError(null); setEditingTemplate(template) }}
                            className="text-sm text-accent hover:underline"
                            data-testid={`prescription-template-edit-${template.id}`}
                          >
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeletingId(template.id)}
                          className="text-sm text-danger hover:underline"
                          data-testid={`prescription-template-delete-${template.id}`}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isPending && !isError && templates && templates.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="prescription-template-list-cards">
            {templates.map((template) => (
              <MobileListCard
                key={template.id}
                data-testid={`prescription-template-card-${template.id}`}
                title={template.name}
                rows={[
                  ...(isAdmin ? [{ label: 'Médico', value: template.doctorName }] : []),
                  {
                    label: 'Medicamentos',
                    value: template.items.length === 1 ? '1 medicamento' : `${template.items.length} medicamentos`,
                  },
                ]}
                actions={
                  <>
                    {isDoctor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditError(null); setEditingTemplate(template) }}
                        data-testid={`prescription-template-card-edit-${template.id}`}
                        className="text-xs text-accent hover:text-accent/80"
                      >
                        Editar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(template.id)}
                      data-testid={`prescription-template-card-delete-${template.id}`}
                      className="text-xs text-danger hover:text-danger/80"
                    >
                      Excluir
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Novo modelo de receita"
        data-testid="prescription-template-create-modal"
      >
        <PrescriptionTemplateForm
          isPending={createMutation.isPending}
          globalError={createError}
          onSubmit={handleCreate}
        />
      </Modal>

      {editingTemplate && (
        <Modal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          title="Editar modelo de receita"
          data-testid="prescription-template-edit-modal"
        >
          <PrescriptionTemplateForm
            initialData={editingTemplate}
            isPending={updateMutation.isPending}
            globalError={editError}
            onSubmit={handleUpdate}
          />
        </Modal>
      )}

      <PrescriptionTemplateDeleteDialog
        isOpen={!!deletingId}
        isPending={deleteMutation.isPending}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
