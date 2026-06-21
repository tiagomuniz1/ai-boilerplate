'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { useCanonicalFieldsAdmin } from '../hooks/use-canonical-fields-admin.hook'
import { useUpdateCanonicalField } from '../hooks/use-update-canonical-field.hook'
import { CanonicalFieldListSkeleton } from './canonical-field-list-skeleton'
import { CanonicalFieldToggleDialog } from './canonical-field-toggle-dialog'
import type { IApiError } from '@/types/api.types'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  boolean: 'Sim/Não',
  date: 'Data',
  select: 'Seleção única',
  multiselect: 'Seleção múltipla',
}

export function CanonicalFieldList() {
  const slug = useSlug()
  const [includeInactive, setIncludeInactive] = useState(false)
  const [fieldToToggle, setFieldToToggle] = useState<ICanonicalFieldModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const { data: fields, isPending, isError } = useCanonicalFieldsAdmin({ includeInactive })
  const { mutate: updateField, isPending: isToggling } = useUpdateCanonicalField()

  function handleToggleClick(field: ICanonicalFieldModel) {
    setFieldToToggle(field)
  }

  function handleToggleClose() {
    setFieldToToggle(null)
  }

  function handleToggleConfirm() {
    /* c8 ignore next */
    if (!fieldToToggle) return

    updateField(
      { id: fieldToToggle.id, data: { isActive: !fieldToToggle.isActive } },
      {
        onSuccess: () => {
          const action = fieldToToggle.isActive ? 'desativado' : 'ativado'
          setFieldToToggle(null)
          setToggleError(null)
          setSuccessMessage(`Campo "${fieldToToggle.label}" ${action} com sucesso.`)
          setTimeout(() => setSuccessMessage(null), 5000)
        },
        onError: (_error: IApiError) => {
          setFieldToToggle(null)
          setToggleError('Não foi possível alterar o campo. Tente novamente.')
          setTimeout(() => setToggleError(null), 6000)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6" data-testid="canonical-field-list">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Campos canônicos</h1>
          {!isPending && !isError && fields && (
            <p className="mt-0.5 text-sm text-text-dim">
              {fields.length === 1 ? '1 campo cadastrado' : `${fields.length} campos cadastrados`}
            </p>
          )}
        </div>
        <Link href={`/${slug}/canonical-fields/new`}>
          <Button variant="primary" data-testid="canonical-field-list-new-button">
            + Novo campo
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="include-inactive"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          className="h-4 w-4 rounded border-line text-accent"
          data-testid="canonical-field-list-include-inactive"
        />
        <label htmlFor="include-inactive" className="text-sm text-text-dim cursor-pointer">
          Incluir campos inativos
        </label>
      </div>

      {successMessage && (
        <Alert variant="success" data-testid="canonical-field-list-success">
          {successMessage}
        </Alert>
      )}

      {toggleError && (
        <Alert variant="error" data-testid="canonical-field-list-toggle-error">
          {toggleError}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <CanonicalFieldListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="canonical-field-list-error">
              Não foi possível carregar a lista de campos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && (!fields || fields.length === 0) && (
          <div className="py-16 text-center" data-testid="canonical-field-list-empty">
            <p className="text-sm text-text-dim">Nenhum campo canônico encontrado.</p>
          </div>
        )}

        {!isPending && !isError && fields && fields.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="canonical-field-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Chave
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Rótulo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr
                    key={field.id}
                    data-testid={`canonical-field-row-${field.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td
                      className="px-6 py-4 text-sm font-mono text-text-dim"
                      data-testid={`canonical-field-key-${field.id}`}
                    >
                      {field.canonicalKey}
                    </td>
                    <td
                      className="px-6 py-4 text-sm font-medium text-text"
                      data-testid={`canonical-field-label-${field.id}`}
                    >
                      {field.label}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`canonical-field-type-${field.id}`}
                    >
                      {FIELD_TYPE_LABELS[field.type] ?? field.type}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        data-testid={`canonical-field-status-${field.id}`}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          field.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-line text-text-mute'
                        }`}
                      >
                        {field.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleClick(field)}
                          data-testid={`canonical-field-toggle-button-${field.id}`}
                          className="text-xs text-text-mute hover:text-text"
                        >
                          {field.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Link
                          href={`/${slug}/canonical-fields/${field.id}/edit`}
                          data-testid={`canonical-field-edit-link-${field.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
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

      <CanonicalFieldToggleDialog
        field={fieldToToggle}
        isOpen={fieldToToggle !== null}
        isPending={isToggling}
        onClose={handleToggleClose}
        onConfirm={handleToggleConfirm}
      />
    </div>
  )
}
