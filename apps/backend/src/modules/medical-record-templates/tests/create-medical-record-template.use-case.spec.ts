import { ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import {
  CreateMedicalRecordTemplateDto,
  MedicalRecordFieldType,
  UserRole,
} from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IClinicSpecialtiesRepository } from '../../clinic-specialties/repositories/clinic-specialties.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordCanonicalFieldsRepository } from '../../medical-record-canonical-fields/repositories/medical-record-canonical-fields.repository.interface'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { CreateMedicalRecordTemplateUseCase } from '../use-cases/create-medical-record-template.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockClinicSpecialtiesRepository = {
  findByClinicAndSpecialty: jest.fn(),
} as unknown as jest.Mocked<IClinicSpecialtiesRepository>

const mockSpecialtiesRepository = {
  findById: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

const mockCanonicalFieldsRepository = {
  findByCanonicalKey: jest.fn(),
} as unknown as jest.Mocked<IMedicalRecordCanonicalFieldsRepository>

const mockCacheService = {
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

const makeTemplate = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId: 'spec-1',
  name: 'Template',
  fields: [],
  sections: [],
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const freeField = {
  label: 'Observações',
  type: MedicalRecordFieldType.TEXTAREA,
  required: false,
  order: 1,
  canonical: false,
}

describe('CreateMedicalRecordTemplateUseCase', () => {
  let useCase: CreateMedicalRecordTemplateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateMedicalRecordTemplateUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockClinicSpecialtiesRepository,
      mockSpecialtiesRepository,
      mockCanonicalFieldsRepository,
      mockCacheService,
    )
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue({ id: 'cs-1' } as any)
    mockTemplatesRepository.findByClinicAndSpecialty.mockResolvedValue(null)
    mockSpecialtiesRepository.findById.mockResolvedValue({ id: 'spec-1', name: 'Cardiologia' } as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  const baseDto: CreateMedicalRecordTemplateDto = {
    specialtyId: 'spec-1',
    name: 'Prontuário de Cardiologia',
    fields: [freeField],
  }

  it('throws when specialty is not linked to the clinic', async () => {
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, currentUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockTemplatesRepository.create).not.toHaveBeenCalled()
  })

  it('throws when a template already exists for the specialty', async () => {
    mockTemplatesRepository.findByClinicAndSpecialty.mockResolvedValue(makeTemplate() as any)

    await expect(useCase.execute(baseDto, currentUser)).rejects.toThrow(ConflictException)
    expect(mockTemplatesRepository.create).not.toHaveBeenCalled()
  })

  it('creates a generalist template without checking a clinic-specialty link', async () => {
    mockTemplatesRepository.create.mockImplementation((data: any) =>
      Promise.resolve(makeTemplate({ ...data }) as any),
    )

    const result = await useCase.execute(
      { name: 'Prontuário clínico geral', fields: [freeField] },
      currentUser,
    )

    expect(mockClinicSpecialtiesRepository.findByClinicAndSpecialty).not.toHaveBeenCalled()
    expect(mockTemplatesRepository.findByClinicAndSpecialty).toHaveBeenCalledWith(clinicId, null)
    const createArg = mockTemplatesRepository.create.mock.calls[0][0] as any
    expect(createArg.specialtyId).toBeNull()
    expect(result.specialtyId).toBeNull()
    expect(result.specialtyName).toBeNull()
  })

  it('throws Conflict when a generalist template already exists for the clinic', async () => {
    mockTemplatesRepository.findByClinicAndSpecialty.mockResolvedValue(
      makeTemplate({ specialtyId: null }) as any,
    )

    await expect(
      useCase.execute({ name: 'Outro clínico geral', fields: [freeField] }, currentUser),
    ).rejects.toThrow(ConflictException)
    expect(mockTemplatesRepository.create).not.toHaveBeenCalled()
  })

  it('generates field keys and ignores any client-provided key', async () => {
    mockTemplatesRepository.create.mockImplementation((data: any) =>
      Promise.resolve(makeTemplate({ ...data }) as any),
    )

    const result = await useCase.execute(
      {
        ...baseDto,
        fields: [{ ...freeField, key: 'hacked_key' } as any],
      },
      currentUser,
    )

    const createdFields = (mockTemplatesRepository.create.mock.calls[0][0] as any).fields
    expect(createdFields[0].key).toMatch(/^observacoes_[a-z0-9]{4}$/)
    expect(createdFields[0].key).not.toBe('hacked_key')
    expect(result.specialtyName).toBe('Cardiologia')
    expect(result.fields[0].canonical).toBe(false)
    expect(result.fields[0].canonicalKey).toBeNull()
  })

  it('persists a clinic-scoped template and invalidates list cache', async () => {
    mockTemplatesRepository.create.mockResolvedValue(makeTemplate() as any)

    await useCase.execute(baseDto, currentUser)

    expect(mockTemplatesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ specialtyId: 'spec-1', name: baseDto.name }),
      clinicId,
    )
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}*`,
    )
  })

  it('throws when a select field has no options', async () => {
    await expect(
      useCase.execute(
        {
          ...baseDto,
          fields: [{ ...freeField, type: MedicalRecordFieldType.SELECT }],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws when a select field has duplicate option values', async () => {
    await expect(
      useCase.execute(
        {
          ...baseDto,
          fields: [
            {
              ...freeField,
              type: MedicalRecordFieldType.SELECT,
              options: [
                { value: 'a', label: 'A' },
                { value: 'a', label: 'B' },
              ],
            },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws when a non-select field provides options', async () => {
    await expect(
      useCase.execute(
        {
          ...baseDto,
          fields: [{ ...freeField, options: [{ value: 'a', label: 'A' }] }],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws when a canonical field has no canonicalKey', async () => {
    await expect(
      useCase.execute(
        {
          ...baseDto,
          fields: [{ ...freeField, canonical: true }],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws when canonicalKey does not exist in the catalog', async () => {
    mockCanonicalFieldsRepository.findByCanonicalKey.mockResolvedValue(null)

    await expect(
      useCase.execute(
        {
          ...baseDto,
          fields: [{ ...freeField, canonical: true, canonicalKey: 'missing' }],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws when canonical field type does not match the catalog type', async () => {
    mockCanonicalFieldsRepository.findByCanonicalKey.mockResolvedValue({
      type: MedicalRecordFieldType.NUMBER,
    } as any)

    await expect(
      useCase.execute(
        {
          ...baseDto,
          fields: [
            { ...freeField, type: MedicalRecordFieldType.TEXTAREA, canonical: true, canonicalKey: 'allergies' },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('accepts a valid canonical field', async () => {
    mockCanonicalFieldsRepository.findByCanonicalKey.mockResolvedValue({
      type: MedicalRecordFieldType.TEXTAREA,
    } as any)
    mockTemplatesRepository.create.mockImplementation((data: any) =>
      Promise.resolve(makeTemplate({ ...data }) as any),
    )

    const result = await useCase.execute(
      {
        ...baseDto,
        fields: [
          { ...freeField, type: MedicalRecordFieldType.TEXTAREA, canonical: true, canonicalKey: 'allergies' },
        ],
      },
      currentUser,
    )

    expect(result.fields[0].canonical).toBe(true)
    expect(result.fields[0].canonicalKey).toBe('allergies')
  })

  it('returns null specialtyName when specialty is not found', async () => {
    mockSpecialtiesRepository.findById.mockResolvedValue(null)
    mockTemplatesRepository.create.mockResolvedValue(makeTemplate() as any)

    const result = await useCase.execute(baseDto, currentUser)

    expect(result.specialtyName).toBeNull()
  })

  it('continues when cache invalidation fails', async () => {
    mockTemplatesRepository.create.mockResolvedValue(makeTemplate() as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(baseDto, currentUser)

    expect(result.id).toBeDefined()
  })

  describe('resolveSections', () => {
    it('preserves a client-provided section key', async () => {
      mockTemplatesRepository.create.mockImplementation((data: any) =>
        Promise.resolve(makeTemplate({ sections: data.sections, fields: data.fields }) as any),
      )

      const result = await useCase.execute(
        { ...baseDto, sections: [{ key: 's_abc123', title: 'Anamnese', order: 0 }] },
        currentUser,
      )

      expect(result.sections[0].key).toBe('s_abc123')
      expect(result.sections[0].title).toBe('Anamnese')
    })

    it('generates a key when no key is provided', async () => {
      mockTemplatesRepository.create.mockImplementation((data: any) =>
        Promise.resolve(makeTemplate({ sections: data.sections, fields: data.fields }) as any),
      )

      const result = await useCase.execute(
        { ...baseDto, sections: [{ title: 'Exame Físico', order: 0 }] },
        currentUser,
      )

      expect(result.sections[0].key).toMatch(/^exame_fisico_[a-z0-9]{4}$/)
    })

    it('generates a fallback key when a duplicate key is submitted', async () => {
      mockTemplatesRepository.create.mockImplementation((data: any) =>
        Promise.resolve(makeTemplate({ sections: data.sections, fields: data.fields }) as any),
      )

      const result = await useCase.execute(
        {
          ...baseDto,
          sections: [
            { key: 'dup', title: 'A', order: 0 },
            { key: 'dup', title: 'B', order: 1 },
          ],
        },
        currentUser,
      )

      expect(result.sections[0].key).toBe('dup')
      expect(result.sections[1].key).not.toBe('dup')
      expect(result.sections[1].key).toMatch(/^b_[a-z0-9]{4}$/)
    })

    it('accepts a field whose sectionKey matches a provided section', async () => {
      mockTemplatesRepository.create.mockImplementation((data: any) =>
        Promise.resolve(makeTemplate({ sections: data.sections, fields: data.fields }) as any),
      )

      const result = await useCase.execute(
        {
          ...baseDto,
          sections: [{ key: 's_abc123', title: 'Anamnese', order: 0 }],
          fields: [{ ...freeField, sectionKey: 's_abc123' }],
        },
        currentUser,
      )

      expect(result.fields[0].sectionKey).toBe('s_abc123')
    })
  })

  describe('validateSectionKey', () => {
    it('throws when a field references a sectionKey that has no matching section', async () => {
      await expect(
        useCase.execute(
          { ...baseDto, fields: [{ ...freeField, sectionKey: 'nonexistent_key' }] },
          currentUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockTemplatesRepository.create).not.toHaveBeenCalled()
    })
  })
})
