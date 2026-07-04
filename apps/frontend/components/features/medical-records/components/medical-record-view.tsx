'use client'

import { useState } from 'react'
import { MedicalRecordFieldType } from '@app/shared'
import { Tabs } from '@/components/ui/atoms/tabs/tabs'
import type { IMedicalRecordModel, IRecordFieldModel } from '../types/medical-record-model.types'

interface IViewSection {
  key: string
  title: string
  order: number
}

interface MedicalRecordViewProps {
  record: IMedicalRecordModel
  sections?: IViewSection[]
}

const NOTES_TAB = '__notes__'
const GENERAL_TAB = '__general__'

function formatFieldValue(type: MedicalRecordFieldType, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'

  switch (type) {
    case MedicalRecordFieldType.BOOLEAN:
      return value ? 'Sim' : 'Não'
    case MedicalRecordFieldType.MULTISELECT:
      return Array.isArray(value) ? value.join(', ') : String(value)
    default:
      return String(value)
  }
}

function FieldRow({ field, value }: { field: IRecordFieldModel; value: unknown }) {
  const isLong =
    field.type === MedicalRecordFieldType.TEXTAREA ||
    (typeof value === 'string' && value.length > 60)

  return (
    <div
      data-testid={`record-field-${field.key}`}
      className={isLong ? 'col-span-2' : undefined}
    >
      <dt className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
        {field.label}
      </dt>
      <dd className="text-sm text-text whitespace-pre-wrap">
        {formatFieldValue(field.type, value)}
      </dd>
    </div>
  )
}

function FieldsGrid({ fields, record }: { fields: IRecordFieldModel[]; record: IMedicalRecordModel }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      {fields.map((field) => (
        <FieldRow key={field.key} field={field} value={record.data[field.key]} />
      ))}
    </dl>
  )
}

export function MedicalRecordView({ record, sections = [] }: MedicalRecordViewProps) {
  const sortedSections = sections.slice().sort((a, b) => a.order - b.order)
  const hasSections = sortedSections.length > 0

  const fieldsBySection = new Map<string | null, IRecordFieldModel[]>()
  for (const field of record.schema) {
    const key = field.sectionKey ?? null
    if (!fieldsBySection.has(key)) fieldsBySection.set(key, [])
    fieldsBySection.get(key)!.push(field)
  }
  const unsectionedFields = fieldsBySection.get(null) ?? []

  const hasNotes = !!record.notes
  const nonEmptySections = sortedSections.filter(
    (s) => (fieldsBySection.get(s.key) ?? []).length > 0,
  )

  const firstTab = hasSections
    ? (unsectionedFields.length > 0 ? GENERAL_TAB : (nonEmptySections[0]?.key ?? NOTES_TAB))
    : 'all'
  const [activeTab, setActiveTab] = useState<string>(firstTab)

  const tabItems = hasSections
    ? [
        ...(unsectionedFields.length > 0 ? [{ id: GENERAL_TAB, label: 'Geral' }] : []),
        ...nonEmptySections.map((s) => ({ id: s.key, label: s.title })),
        ...(hasNotes ? [{ id: NOTES_TAB, label: 'Notas' }] : []),
      ]
    : []

  // `sections` can arrive after the initial mount (it comes from a separate template
  // query in the parent, while `record` may already be loaded) — so the layout can
  // flip from flat to tabbed on a re-render. `activeTab` state only reflects the tab
  // set at mount time, so fall back to `firstTab` whenever it no longer matches the
  // current tab set instead of trusting stale state.
  const validTabIds = hasSections ? tabItems.map((t) => t.id) : ['all']
  const effectiveTab = validTabIds.includes(activeTab) ? activeTab : firstTab

  return (
    <div className="space-y-4" data-testid="medical-record-view">
      {/* Header: patient / doctor / specialty */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border border-line bg-surface p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Paciente</p>
          <p className="mt-0.5 text-sm font-medium text-text" data-testid="record-patient-name">
            {record.patientName}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Médico</p>
          <p className="mt-0.5 text-sm font-medium text-text" data-testid="record-doctor-name">
            {record.doctorName}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Especialidade</p>
          <p className="mt-0.5 text-sm font-medium text-text" data-testid="record-specialty-name">
            {record.specialtyName}
          </p>
        </div>
      </div>

      {hasSections ? (
        <>
          <Tabs
            items={tabItems}
            activeId={effectiveTab}
            onChange={setActiveTab}
            data-testid="medical-record-view-tabs"
          />

          <div className="min-h-[120px]">
            {effectiveTab === NOTES_TAB && (
              <div className="rounded-lg border border-line bg-surface p-4" data-testid="record-notes">
                <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
                  Notas do médico
                </p>
                <p className="text-sm text-text whitespace-pre-wrap">{record.notes}</p>
              </div>
            )}

            {effectiveTab === GENERAL_TAB && (
              <div className="rounded-lg border border-line bg-surface p-4">
                <FieldsGrid fields={unsectionedFields} record={record} />
              </div>
            )}

            {effectiveTab !== NOTES_TAB && effectiveTab !== GENERAL_TAB && (
              <div
                className="rounded-lg border border-line bg-surface p-4"
                data-testid={`record-section-${effectiveTab}`}
              >
                {/* effectiveTab only ever matches a nonEmptySections key here, so the field list is guaranteed. */}
                <FieldsGrid
                  fields={fieldsBySection.get(effectiveTab)!}
                  record={record}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-line bg-surface p-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {record.schema.map((field) => (
                <FieldRow key={field.key} field={field} value={record.data[field.key]} />
              ))}
            </dl>
          </div>

          {record.notes && (
            <div className="rounded-lg border border-line bg-surface p-4" data-testid="record-notes">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
                Notas do médico
              </p>
              <p className="text-sm text-text whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
