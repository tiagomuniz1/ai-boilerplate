'use client'

import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CouncilType, COUNCIL_TYPE_PROFESSION_LABELS, MedicalRecordFieldType, UserRole, getPrimaryCouncilType } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAuthStore } from '@/stores/auth.store'
import { useMyProfessional } from '@/components/features/professionals/hooks/use-my-professional.hook'
import { FieldEditor } from './field-editor'
import { SectionEditor } from './section-editor'
import { CanonicalFieldPicker } from './canonical-field-picker'
import { SortableList, SortableItem } from '@/components/ui/molecules/sortable-list/sortable-list'
import { useClinicSpecialties } from '@/components/features/clinic-specialties/hooks/use-clinic-specialties.hook'
import type { ITemplateModel } from '../types/template-model.types'
import type { ICreateTemplateInput, IUpdateTemplateInput, ITemplateFieldInput, ITemplateSectionInput } from '../types/template-input.types'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { IApiError } from '@/types/api.types'

const SELECT_TYPES = [MedicalRecordFieldType.SELECT, MedicalRecordFieldType.MULTISELECT]
const COUNCIL_TYPES = Object.values(CouncilType)

const optionSchema = z.object({
  value: z.string().min(1, 'Obrigatório').max(60, 'Máx. 60 caracteres'),
  label: z.string().min(1, 'Obrigatório').max(120, 'Máx. 120 caracteres'),
})

const fieldSchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1, 'Rótulo obrigatório').max(120, 'Máx. 120 caracteres'),
  type: z.nativeEnum(MedicalRecordFieldType),
  required: z.boolean(),
  order: z.number(),
  options: z.array(optionSchema),
  placeholder: z.string(),
  helpText: z.string(),
  canonical: z.boolean(),
  canonicalKey: z.string(),
  sectionKey: z.string(),
})

const sectionSchema = z.object({
  key: z.string().optional(),
  title: z.string().min(1, 'Título da seção obrigatório').max(80, 'Máx. 80 caracteres'),
  order: z.number(),
  fields: z.array(fieldSchema),
})

function validateFieldOptions(
  fields: z.infer<typeof fieldSchema>[],
  ctx: z.RefinementCtx,
  basePath: (string | number)[],
) {
  fields.forEach((field, index) => {
    if (SELECT_TYPES.includes(field.type)) {
      if (!field.options || field.options.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: [...basePath, index, 'options'],
          message: 'Adicione ao menos uma opção para este tipo de campo.',
        })
      } else {
        const values = field.options.map((o) => o.value)
        if (new Set(values).size !== values.length) {
          ctx.addIssue({
            code: 'custom',
            path: [...basePath, index, 'options'],
            message: 'Os valores das opções devem ser únicos.',
          })
        }
      }
    }
  })
}

const baseObjectSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120, 'Máx. 120 caracteres'),
  specialtyId: z.string().optional(),
  councilType: z.string().optional(),
  fields: z.array(fieldSchema),
  sections: z.array(sectionSchema),
})

export type ITemplateFormValues = z.infer<typeof baseObjectSchema>

function addRefinements<T extends z.ZodObject<any>>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const flatFields = data.fields as z.infer<typeof fieldSchema>[]
    const sections = data.sections as z.infer<typeof sectionSchema>[]

    const totalFields = flatFields.length + sections.reduce((acc, s) => acc + s.fields.length, 0)
    if (totalFields === 0) {
      ctx.addIssue({ code: 'custom', path: ['fields'], message: 'Adicione ao menos um campo' })
    }

    validateFieldOptions(flatFields, ctx, ['fields'])
    sections.forEach((section, si) => {
      validateFieldOptions(section.fields, ctx, ['sections', si, 'fields'])
    })
  })
}

const formSchemaCreate = addRefinements(
  baseObjectSchema.extend({
    // Optional: an empty value creates a generalist template (no specialty).
    specialtyId: z.string().optional(),
  }),
)

const formSchemaEdit = addRefinements(baseObjectSchema)

function getMsg(err: unknown): string | undefined {
  return (err as { message?: string } | undefined)?.message
}

function toFormField(
  field: ITemplateFieldInput | ITemplateModel['fields'][number],
): ITemplateFormValues['fields'][number] {
  return {
    /* c8 ignore next */
    key: 'key' in field ? field.key : undefined,
    label: field.label,
    type: field.type,
    required: field.required,
    order: field.order,
    options: field.options ? field.options.map((o) => ({ value: o.value, label: o.label })) : [],
    placeholder: field.placeholder ?? '',
    helpText: field.helpText ?? '',
    canonical: field.canonical,
    canonicalKey: field.canonicalKey ?? '',
    sectionKey: field.sectionKey ?? '',
  }
}

interface TemplateFormProps {
  mode: 'create'
  specialtyId?: string
  onSubmit: (data: ICreateTemplateInput) => void
  isPending: boolean
  error?: IApiError | null
  globalError?: string | null
}

interface TemplateFormEditProps {
  mode: 'edit'
  template: ITemplateModel
  specialtyId?: string
  onSubmit: (data: IUpdateTemplateInput) => void
  isPending: boolean
  error?: IApiError | null
  globalError?: string | null
}

type Props = TemplateFormProps | TemplateFormEditProps

export function TemplateForm(props: Props) {
  const isEdit = props.mode === 'edit'
  const template = isEdit ? (props as TemplateFormEditProps).template : undefined

  const authUser = useAuthStore((s) => s.user)
  const isProfessional = authUser?.role === UserRole.PROFESSIONAL
  const { data: myProfessional } = useMyProfessional()
  // Defaults to CRM while the professional's own profile is still loading, so the specialty
  // selector doesn't flash hidden-then-visible for the common (CRM) case.
  const isCrmProfessional =
    !myProfessional || getPrimaryCouncilType(myProfessional.registrations) === CouncilType.CRM

  // As especialidades da CLÍNICA, não o catálogo da plataforma: um modelo só faz
  // sentido para uma especialidade que a clínica atende. O PROFESSIONAL é mais
  // restrito ainda — só as próprias. A opção "Generalista (sem especialidade)"
  // é a `value=""` do select e independe desta lista.
  const { data: clinicSpecialtiesPaginated } = useClinicSpecialties(authUser?.clinicId ?? '', {
    limit: 100,
  })
  const specialties =
    isProfessional && myProfessional
      ? myProfessional.specialties.map((s) => ({ id: s.id, name: s.name }))
      : (clinicSpecialtiesPaginated?.data ?? []).map((s) => ({ id: s.specialtyId, name: s.name }))

  const defaultFlatFields = template
    ? template.fields
        .filter((f) => !f.sectionKey)
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((f) => toFormField(f))
    : []

  const defaultSections = template
    ? template.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          key: s.key,
          title: s.title,
          order: s.order,
          fields: template.fields
            .filter((f) => f.sectionKey === s.key)
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((f) => toFormField(f)),
        }))
    : []

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ITemplateFormValues>({
    resolver: zodResolver(isEdit ? formSchemaEdit : formSchemaCreate),
    defaultValues: {
      name: template?.name ?? '',
      specialtyId: props.specialtyId ?? '',
      // Matches the "Profissão" select's first (and implicit default) option — see
      // showProfessionSelector below, which only ADMIN ever sees.
      councilType: CouncilType.CRM,
      fields: defaultFlatFields,
      sections: defaultSections,
    },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'fields' })
  const { fields: sections, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({ control, name: 'sections' })

  const watchedFields = useWatch({ control, name: 'fields' })
  const watchedSpecialtyId = useWatch({ control, name: 'specialtyId' })
  const watchedCouncilType = useWatch({ control, name: 'councilType' })

  useEffect(() => {
    if (!isEdit && props.specialtyId && specialties.some((s) => s.id === props.specialtyId)) {
      setValue('specialtyId', props.specialtyId)
    }
  }, [specialties, isEdit, props.specialtyId, setValue])

  // Only ADMIN can set the profession explicitly for a non-specialty template — a professional's
  // own profession is always derived server-side from their registration, never user-selected.
  // Always shown first: which profession the template is for drives whether specialty even applies.
  const showProfessionSelector = !isEdit && !isProfessional
  // Specialties only exist for medicine (CRM) — every other profession goes straight to the
  // profession-wide template (see permissions.md). CRM professionals keep the picker restricted
  // to their own specialties; ADMIN only sees it once "Profissão" is set to Medicina.
  const showSpecialtySelector =
    !isEdit && (isProfessional ? isCrmProfessional : watchedCouncilType === CouncilType.CRM)

  // Clear a stale specialty selection if ADMIN switches "Profissão" away from Medicina.
  useEffect(() => {
    if (showProfessionSelector && watchedCouncilType !== CouncilType.CRM && watchedSpecialtyId) {
      setValue('specialtyId', '')
    }
  }, [showProfessionSelector, watchedCouncilType, watchedSpecialtyId, setValue])


  function buildFieldInputs(
    formFields: ITemplateFormValues['fields'],
    sectionKey: string,
  ): ITemplateFieldInput[] {
    return formFields.map((f, i) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      order: i,
      options: f.options,
      placeholder: f.placeholder,
      helpText: f.helpText,
      canonical: f.canonical,
      canonicalKey: f.canonicalKey,
      sectionKey,
    }))
  }

  function onSubmit(values: ITemplateFormValues) {
    const flatFieldInputs = buildFieldInputs(values.fields, '')

    const sectionInputs: ITemplateSectionInput[] = values.sections.map((s, i) => ({
      key: s.key,
      title: s.title,
      order: i,
    }))

    const sectionFieldInputs: ITemplateFieldInput[] = values.sections.flatMap((s) =>
      buildFieldInputs(s.fields, s.key!),
    )

    const allFields = [...flatFieldInputs, ...sectionFieldInputs]

    if (isEdit) {
      ;(props as TemplateFormEditProps).onSubmit({
        name: values.name,
        fields: allFields,
        sections: sectionInputs,
      })
    } else {
      // A non-CRM professional's profession is always their own, never user-selected — derive it
      // here rather than trusting a hidden/absent form field. Everyone else uses whatever the
      // "Profissão" selector resolved to (ADMIN), or nothing at all when a specialty was picked.
      const councilType =
        isProfessional && myProfessional && !isCrmProfessional
          ? getPrimaryCouncilType(myProfessional.registrations)
          : (values.councilType as CouncilType)

      ;(props as TemplateFormProps).onSubmit({
        specialtyId: values.specialtyId || undefined,
        councilType: values.specialtyId ? undefined : councilType,
        name: values.name,
        fields: allFields,
        sections: sectionInputs,
      })
    }
  }

  function handleAddFlatField() {
    append({
      key: undefined,
      label: '',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: fields.length,
      options: [],
      placeholder: '',
      helpText: '',
      canonical: false,
      canonicalKey: '',
      sectionKey: '',
    })
  }

  function handleAddSection() {
    const clientKey = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    appendSection({
      key: clientKey,
      title: '',
      order: sections.length,
      fields: [],
    })
  }

  function handleAdoptCanonicalField(canonicalField: ICanonicalFieldModel) {
    append({
      key: undefined,
      label: canonicalField.label,
      type: canonicalField.type,
      required: false,
      order: fields.length,
      options: canonicalField.options
        ? canonicalField.options.map((o) => ({ value: o.value, label: o.label }))
        : [],
      placeholder: '',
      helpText: '',
      canonical: true,
      canonicalKey: canonicalField.canonicalKey,
      sectionKey: '',
    })
  }

  const watchedSections = watch('sections')

  function getSectionLabel(index: number): string {
    return watchedSections?.[index]?.title?.trim() || `Seção ${index + 1}`
  }

  // Containers that a flat field can be moved to: all sections
  const flatFieldMoveToContainers = sections.map((_, i) => ({
    id: `section-${i}`,
    label: getSectionLabel(i),
  }))

  // Containers that a field inside section N can be moved to: flat + all other sections
  function getSectionFieldMoveToContainers(sectionIndex: number) {
    return [
      { id: 'flat', label: 'Campos gerais' },
      ...sections
        .map((_, i) => ({ id: `section-${i}`, label: getSectionLabel(i) }))
        .filter((_, i) => i !== sectionIndex),
    ]
  }

  function handleMoveField(
    sourceContainerId: string,
    fieldIndex: number,
    targetContainerId: string,
  ) {
    const values = getValues()

    // Pull the field out of the source array
    let fieldData: ITemplateFormValues['fields'][number]
    if (sourceContainerId === 'flat') {
      fieldData = values.fields[fieldIndex]
      setValue('fields', values.fields.filter((_, i) => i !== fieldIndex))
    } else {
      const si = parseInt(sourceContainerId.replace('section-', ''), 10)
      fieldData = values.sections[si].fields[fieldIndex]
      setValue(`sections.${si}.fields` as any, values.sections[si].fields.filter((_, i) => i !== fieldIndex))
    }

    // Append the field to the target array
    if (targetContainerId === 'flat') {
      setValue('fields', [...values.fields, fieldData])
    } else {
      const ti = parseInt(targetContainerId.replace('section-', ''), 10)
      setValue(`sections.${ti}.fields` as any, [...values.sections[ti].fields, fieldData])
    }
  }

  const hasTotalFieldsError =
    getMsg(errors.fields) === 'Adicione ao menos um campo' ||
    (errors.fields as any)?.message === 'Adicione ao menos um campo'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" data-testid="template-form">
      {props.globalError && (
        <Alert variant="error" data-testid="template-form-global-error">
          {props.globalError}
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text" htmlFor="template-name">
          Nome do modelo <span className="text-error">*</span>
        </label>
        <Input
          id="template-name"
          {...register('name')}
          placeholder="Ex: Anamnese Cardiológica"
          error={errors.name?.message}
          data-testid="template-form-name"
        />
      </div>

      {showProfessionSelector && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor="template-council-type">
            Profissão
          </label>
          <select
            id="template-council-type"
            {...register('councilType')}
            data-testid="template-form-council-type"
            className="h-10 w-full rounded-md px-3 text-base bg-surface border border-line text-text transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {COUNCIL_TYPES.map((councilType) => (
              <option key={councilType} value={councilType}>
                {COUNCIL_TYPE_PROFESSION_LABELS[councilType]}
              </option>
            ))}
          </select>
        </div>
      )}

      {showSpecialtySelector && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor="template-specialty">
            Especialidade
          </label>
          <select
            id="template-specialty"
            {...register('specialtyId')}
            aria-invalid={!!errors.specialtyId}
            data-testid="template-form-specialty"
            className="h-10 w-full rounded-md px-3 text-base bg-surface border border-line text-text transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg aria-[invalid=true]:border-danger"
          >
            <option value="">Generalista (sem especialidade)</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.specialtyId && (
            <span role="alert" className="text-xs text-danger" data-testid="template-form-specialty-error">
              {errors.specialtyId.message}
            </span>
          )}
        </div>
      )}

      {/* Flat fields (no section) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Campos</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddFlatField}
            data-testid="template-form-add-field"
          >
            + Adicionar campo
          </Button>
        </div>

        {hasTotalFieldsError && (
          <Alert variant="error" data-testid="template-form-fields-error">
            Adicione ao menos um campo
          </Alert>
        )}

        {fields.length === 0 && sections.length === 0 && (
          <div className="py-8 text-center rounded-lg border border-dashed border-line" data-testid="template-form-fields-empty">
            <p className="text-sm text-text-mute">Nenhum campo adicionado. Use os botões acima para adicionar campos ou seções.</p>
          </div>
        )}

        <SortableList ids={fields.map((f) => f.id)} onReorder={(from, to) => move(from, to)}>
          {fields.map((field, index) => (
            <SortableItem key={field.id} id={field.id}>
              {(handleProps) => (
                <FieldEditor
                  index={index}
                  total={fields.length}
                  control={control}
                  register={register}
                  errors={errors}
                  watchedType={(watchedFields?.[index]?.type as MedicalRecordFieldType) ?? field.type}
                  dragHandleProps={handleProps}
                  moveToContainers={flatFieldMoveToContainers}
                  onMoveToContainer={(targetId) => handleMoveField('flat', index, targetId)}
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                  onRemove={() => remove(index)}
                />
              )}
            </SortableItem>
          ))}
        </SortableList>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Seções</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddSection}
            data-testid="template-form-add-section"
          >
            + Adicionar seção
          </Button>
        </div>

        <SortableList ids={sections.map((s) => s.id)} onReorder={(from, to) => moveSection(from, to)}>
          {sections.map((section, sectionIndex) => (
            <SortableItem key={section.id} id={section.id}>
              {(handleProps) => (
                <SectionEditor
                  sectionIndex={sectionIndex}
                  totalSections={sections.length}
                  control={control}
                  register={register}
                  errors={errors}
                  watch={watch}
                  dragHandleProps={handleProps}
                  fieldMoveToContainers={getSectionFieldMoveToContainers(sectionIndex)}
                  onMoveFieldToContainer={(fieldIndex, targetId) =>
                    handleMoveField(`section-${sectionIndex}`, fieldIndex, targetId)
                  }
                  onMoveUp={() => moveSection(sectionIndex, sectionIndex - 1)}
                  onMoveDown={() => moveSection(sectionIndex, sectionIndex + 1)}
                  onRemove={() => removeSection(sectionIndex)}
                />
              )}
            </SortableItem>
          ))}
        </SortableList>
      </div>

      {/* Canonical fields */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Campos canônicos</h2>
        <p className="text-sm text-text-dim">
          Adote campos padronizados da plataforma para garantir consistência entre modelos.
        </p>
        <CanonicalFieldPicker onAdopt={handleAdoptCanonicalField} />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="submit"
          variant="primary"
          isLoading={props.isPending}
          disabled={props.isPending}
          data-testid="template-form-submit"
        >
          {isEdit ? 'Salvar alterações' : 'Criar modelo'}
        </Button>
      </div>
    </form>
  )
}
