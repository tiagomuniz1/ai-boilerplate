'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { useTemplate } from '../hooks/use-template.hook'
import { useDeleteTemplate } from '../hooks/use-delete-template.hook'
import { TemplateListSkeleton } from './template-list-skeleton'
import { TemplateDeleteDialog } from './template-delete-dialog'
import type { MedicalRecordFieldType } from '@app/shared'
import type { ITemplateFieldModel, ITemplateSectionModel } from '../types/template-model.types'

const FIELD_TYPE_LABELS: Record<MedicalRecordFieldType, string> = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  boolean: 'Sim/Não',
  date: 'Data',
  select: 'Seleção única',
  multiselect: 'Seleção múltipla',
} as Record<MedicalRecordFieldType, string>

function FieldCard({ field, index }: { field: ITemplateFieldModel; index: number }) {
  return (
    <div
      key={field.key ?? index}
      className="rounded-lg border border-line bg-surface-2 p-4 flex flex-col gap-2"
      data-testid={`template-details-field-${index}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">{field.label}</p>
        <div className="flex items-center gap-2">
          {field.canonical && (
            <span className="inline-flex items-center rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-medium">
              Canônico
            </span>
          )}
          {field.required && (
            <span className="inline-flex items-center rounded-full bg-warning/10 text-warning px-2 py-0.5 text-xs font-medium">
              Obrigatório
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-text-mute">
        {/* c8 ignore next */
        FIELD_TYPE_LABELS[field.type] ?? field.type}
        {field.canonicalKey ? ` · ${field.canonicalKey}` : ''}
      </p>
      {field.options && field.options.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {field.options.map((opt) => (
            <span key={opt.value} className="text-xs bg-line rounded px-2 py-0.5 text-text-dim">
              {opt.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionBlock({
  section,
  fields,
  sectionIndex,
}: {
  section: ITemplateSectionModel
  fields: ITemplateFieldModel[]
  sectionIndex: number
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
      data-testid={`template-details-section-${sectionIndex}`}
    >
      <h3 className="text-sm font-semibold text-text" data-testid={`template-details-section-title-${sectionIndex}`}>
        {section.title}
      </h3>
      {fields.length === 0 ? (
        <p className="text-xs text-text-mute" data-testid={`template-details-section-empty-${sectionIndex}`}>
          Nenhum campo nesta seção.
        </p>
      ) : (
        fields.map((field, idx) => <FieldCard key={field.key ?? idx} field={field} index={idx} />)
      )}
    </div>
  )
}

interface TemplateDetailsProps {
  templateId: string
}

export function TemplateDetails({ templateId }: TemplateDetailsProps) {
  const basePath = useBasePath()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === UserRole.ADMIN

  const { data: template, isPending, isError } = useTemplate(templateId)
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate()

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDeleteConfirm() {
    deleteTemplate(templateId, {
      onError: () => {
        setIsDeleteOpen(false)
        setDeleteError('Não foi possível excluir o modelo. Tente novamente.')
        setTimeout(() => setDeleteError(null), 6000)
      },
    })
  }

  if (isPending) {
    return <TemplateListSkeleton />
  }

  if (isError || !template) {
    return (
      <Alert variant="error" data-testid="template-details-error">
        Não foi possível carregar o modelo. Tente novamente.
      </Alert>
    )
  }

  const flatFields = [...template.fields]
    .filter((f) => !f.sectionKey)
    .sort((a, b) => a.order - b.order)

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order)

  const totalFields = template.fields.length

  return (
    <div className="flex flex-col gap-6" data-testid="template-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text" data-testid="template-details-name">
            {template.name}
          </h1>
          <p className="mt-0.5 text-sm text-text-dim">
            Especialidade: <span data-testid="template-details-specialty">{template.specialtyName ?? 'Generalista'}</span>
          </p>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              template.isActive ? 'bg-success/10 text-success' : 'bg-line text-text-mute'
            }`}
            data-testid="template-details-status"
          >
            {template.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link href={`${basePath}/medical-record-templates/${templateId}/edit`}>
              <Button variant="ghost" size="sm" data-testid="template-details-edit-button">
                Editar
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              data-testid="template-details-delete-button"
              className="text-error hover:text-error"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>

      {deleteError && (
        <Alert variant="error" data-testid="template-details-delete-error">
          {deleteError}
        </Alert>
      )}

      <div className="flex flex-col gap-4" data-testid="template-details-fields">
        <h2 className="text-base font-semibold text-text">
          Campos ({totalFields})
        </h2>

        {totalFields === 0 && (
          <p className="text-sm text-text-mute" data-testid="template-details-no-fields">
            Este modelo não possui campos.
          </p>
        )}

        {flatFields.map((field, index) => (
          <FieldCard key={field.key ?? index} field={field} index={index} />
        ))}

        {sortedSections.map((section, sectionIndex) => (
          <SectionBlock
            key={section.key}
            section={section}
            sectionIndex={sectionIndex}
            fields={[...template.fields]
              .filter((f) => f.sectionKey === section.key)
              .sort((a, b) => a.order - b.order)}
          />
        ))}
      </div>

      <TemplateDeleteDialog
        template={isAdmin ? template : null}
        isOpen={isDeleteOpen}
        isPending={isDeleting}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
