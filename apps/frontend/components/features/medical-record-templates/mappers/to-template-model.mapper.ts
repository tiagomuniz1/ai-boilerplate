import type {
  MedicalRecordTemplateResponseDto,
  MedicalRecordTemplateSectionDto,
  PaginatedMedicalRecordTemplatesResponseDto,
  MedicalRecordTemplateFieldDto,
} from '@app/shared'
import type {
  ITemplateModel,
  ITemplateFieldModel,
  ITemplateSectionModel,
  IPaginatedTemplatesModel,
} from '../types/template-model.types'

function toTemplateSectionModel(section: MedicalRecordTemplateSectionDto): ITemplateSectionModel {
  return { key: section.key!, title: section.title, order: section.order }
}

function toTemplateFieldModel(field: MedicalRecordTemplateFieldDto): ITemplateFieldModel {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    order: field.order,
    options: field.options
      ? field.options.map((o) => ({ value: o.value, label: o.label }))
      : null,
    placeholder: field.placeholder ?? null,
    helpText: field.helpText ?? null,
    canonical: field.canonical,
    canonicalKey: field.canonicalKey ?? null,
    sectionKey: field.sectionKey ?? null,
  }
}

export function toTemplateModel(dto: MedicalRecordTemplateResponseDto): ITemplateModel {
  return {
    id: dto.id,
    specialtyId: dto.specialtyId,
    specialtyName: dto.specialtyName,
    councilType: dto.councilType,
    name: dto.name,
    fields: dto.fields.map((f) => toTemplateFieldModel(f)),
    sections: (dto.sections ?? []).map((s) => toTemplateSectionModel(s)),
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}

export function toPaginatedTemplatesModel(
  dto: PaginatedMedicalRecordTemplatesResponseDto,
): IPaginatedTemplatesModel {
  return {
    data: dto.data.map((d) => toTemplateModel(d)),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
  }
}
