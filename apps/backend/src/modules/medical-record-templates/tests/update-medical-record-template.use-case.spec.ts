import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicalRecordFieldType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordCanonicalFieldsRepository } from '../../medical-record-canonical-fields/repositories/medical-record-canonical-fields.repository.interface'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { UpdateMedicalRecordTemplateUseCase } from '../use-cases/update-medical-record-template.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockSpecialtiesRepository = {
  findById: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

const mockCanonicalFieldsRepository = {
  findByCanonicalKey: jest.fn(),
} as unknown as jest.Mocked<IMedicalRecordCanonicalFieldsRepository>

const mockCacheService = {
  del: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

const existingField = {
  key: 'observacoes_ab12',
  label: 'Observações',
  type: MedicalRecordFieldType.TEXTAREA,
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  canonical: false,
  canonicalKey: null,
  sectionKey: null,
}

const makeTemplate = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId: 'spec-1',
  name: 'Template',
  fields: [existingField],
  sections: [],
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('UpdateMedicalRecordTemplateUseCase', () => {
  let useCase: UpdateMedicalRecordTemplateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateMedicalRecordTemplateUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockSpecialtiesRepository,
      mockCanonicalFieldsRepository,
      mockCacheService,
    )
    mockSpecialtiesRepository.findById.mockResolvedValue({ id: 'spec-1', name: 'Cardiologia' } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('throws NotFoundException when template does not exist', async () => {
    mockTemplatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing', { name: 'New' }, currentUser)).rejects.toThrow(
      NotFoundException,
    )
    expect(mockTemplatesRepository.update).not.toHaveBeenCalled()
  })

  it('updates name and invalidates caches', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockResolvedValue(makeTemplate({ id: template.id, name: 'Novo' }) as any)

    const result = await useCase.execute(template.id, { name: 'Novo' }, currentUser)

    expect(mockTemplatesRepository.update).toHaveBeenCalledWith(template.id, { name: 'Novo' }, clinicId)
    expect(mockCacheService.del).toHaveBeenCalledWith(
      `medical_record_template:${clinicId}:${template.id}`,
    )
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}*`,
    )
    expect(result.name).toBe('Novo')
  })

  it('updates isActive', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockResolvedValue(makeTemplate({ id: template.id, isActive: false }) as any)

    await useCase.execute(template.id, { isActive: false }, currentUser)

    expect(mockTemplatesRepository.update).toHaveBeenCalledWith(template.id, { isActive: false }, clinicId)
  })

  it('preserves keys of existing fields and generates keys for new ones', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
      Promise.resolve(makeTemplate({ id: template.id, fields: data.fields }) as any),
    )

    const result = await useCase.execute(
      template.id,
      {
        fields: [
          { ...existingField },
          {
            label: 'Peso',
            type: MedicalRecordFieldType.NUMBER,
            required: true,
            order: 2,
            canonical: false,
          },
        ],
      },
      currentUser,
    )

    expect(result.fields[0].key).toBe('observacoes_ab12')
    expect(result.fields[1].key).toMatch(/^peso_[a-z0-9]{4}$/)
  })

  it('generates a new key when an unknown key is sent', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
      Promise.resolve(makeTemplate({ id: template.id, fields: data.fields }) as any),
    )

    const result = await useCase.execute(
      template.id,
      { fields: [{ ...existingField, key: 'unknown_key' }] },
      currentUser,
    )

    expect(result.fields[0].key).not.toBe('unknown_key')
    expect(result.fields[0].key).toMatch(/^observacoes_[a-z0-9]{4}$/)
  })

  it('revalidates options when fields change', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)

    await expect(
      useCase.execute(
        template.id,
        {
          fields: [{ ...existingField, type: MedicalRecordFieldType.SELECT, options: null }],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockTemplatesRepository.update).not.toHaveBeenCalled()
  })

  it('rejects duplicate option values on a select field', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)

    await expect(
      useCase.execute(
        template.id,
        {
          fields: [
            {
              label: 'Risco',
              type: MedicalRecordFieldType.SELECT,
              required: true,
              order: 1,
              options: [
                { value: 'a', label: 'A' },
                { value: 'a', label: 'B' },
              ],
              canonical: false,
            },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('rejects options on a non-select field', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)

    await expect(
      useCase.execute(
        template.id,
        {
          fields: [
            {
              label: 'Peso',
              type: MedicalRecordFieldType.NUMBER,
              required: true,
              order: 1,
              options: [{ value: 'a', label: 'A' }],
              canonical: false,
            },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('rejects a canonical field without canonicalKey', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)

    await expect(
      useCase.execute(
        template.id,
        {
          fields: [
            { label: 'Alergias', type: MedicalRecordFieldType.TEXTAREA, required: false, order: 1, canonical: true },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('rejects a canonical field whose key is missing from the catalog', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockCanonicalFieldsRepository.findByCanonicalKey.mockResolvedValue(null)

    await expect(
      useCase.execute(
        template.id,
        {
          fields: [
            {
              label: 'Alergias',
              type: MedicalRecordFieldType.TEXTAREA,
              required: false,
              order: 1,
              canonical: true,
              canonicalKey: 'missing',
            },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('rejects a canonical field whose type diverges from the catalog', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockCanonicalFieldsRepository.findByCanonicalKey.mockResolvedValue({
      type: MedicalRecordFieldType.NUMBER,
    } as any)

    await expect(
      useCase.execute(
        template.id,
        {
          fields: [
            {
              label: 'Alergias',
              type: MedicalRecordFieldType.TEXTAREA,
              required: false,
              order: 1,
              canonical: true,
              canonicalKey: 'allergies',
            },
          ],
        },
        currentUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('accepts a valid canonical field', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockCanonicalFieldsRepository.findByCanonicalKey.mockResolvedValue({
      type: MedicalRecordFieldType.TEXTAREA,
    } as any)
    mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
      Promise.resolve(makeTemplate({ id: template.id, fields: data.fields }) as any),
    )

    const result = await useCase.execute(
      template.id,
      {
        fields: [
          {
            label: 'Alergias',
            type: MedicalRecordFieldType.TEXTAREA,
            required: false,
            order: 1,
            canonical: true,
            canonicalKey: 'allergies',
          },
        ],
      },
      currentUser,
    )

    expect(result.fields[0].canonical).toBe(true)
    expect(result.fields[0].canonicalKey).toBe('allergies')
  })

  it('converts OptimisticLockVersionMismatchError to ConflictException', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('T', 1, 2))

    await expect(useCase.execute(template.id, { name: 'X2' }, currentUser)).rejects.toThrow(
      ConflictException,
    )
  })

  it('rethrows unexpected errors from the repository', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockRejectedValue(new Error('db down'))

    await expect(useCase.execute(template.id, { name: 'X2' }, currentUser)).rejects.toThrow('db down')
  })

  it('returns null specialtyName when specialty is not found', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockResolvedValue(template as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    const result = await useCase.execute(template.id, { name: 'X2' }, currentUser)

    expect(result.specialtyName).toBeNull()
  })

  it('skips the specialty lookup for a generalist template (null specialtyId)', async () => {
    const template = makeTemplate({ specialtyId: null })
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockResolvedValue(template as any)

    const result = await useCase.execute(template.id, { name: 'X2' }, currentUser)

    expect(mockSpecialtiesRepository.findById).not.toHaveBeenCalled()
    expect(result.specialtyId).toBeNull()
    expect(result.specialtyName).toBeNull()
  })

  it('continues when cache invalidation fails', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockTemplatesRepository.update.mockResolvedValue(template as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(template.id, { name: 'X2' }, currentUser)

    expect(result.id).toBe(template.id)
  })

  describe('resolveSections', () => {
    it('preserves a provided unique section key', async () => {
      const template = makeTemplate()
      mockTemplatesRepository.findById.mockResolvedValue(template as any)
      mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
        Promise.resolve(makeTemplate({ id: template.id, sections: data.sections, fields: data.fields ?? template.fields }) as any),
      )

      const result = await useCase.execute(
        template.id,
        { sections: [{ key: 'anamnese_xyz9', title: 'Anamnese', order: 0 }] },
        currentUser,
      )

      expect(result.sections[0].key).toBe('anamnese_xyz9')
      expect(result.sections[0].title).toBe('Anamnese')
    })

    it('generates a key when none is provided', async () => {
      const template = makeTemplate()
      mockTemplatesRepository.findById.mockResolvedValue(template as any)
      mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
        Promise.resolve(makeTemplate({ id: template.id, sections: data.sections, fields: data.fields ?? template.fields }) as any),
      )

      const result = await useCase.execute(
        template.id,
        { sections: [{ title: 'Exame Físico', order: 0 }] },
        currentUser,
      )

      expect(result.sections[0].key).toMatch(/^exame_fisico_[a-z0-9]{4}$/)
    })

    it('generates a fallback key when a duplicate key is submitted', async () => {
      const template = makeTemplate()
      mockTemplatesRepository.findById.mockResolvedValue(template as any)
      mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
        Promise.resolve(makeTemplate({ id: template.id, sections: data.sections, fields: data.fields ?? template.fields }) as any),
      )

      const result = await useCase.execute(
        template.id,
        {
          sections: [
            { key: 'dup_key', title: 'A', order: 0 },
            { key: 'dup_key', title: 'B', order: 1 },
          ],
        },
        currentUser,
      )

      expect(result.sections[0].key).toBe('dup_key')
      expect(result.sections[1].key).not.toBe('dup_key')
      expect(result.sections[1].key).toMatch(/^b_[a-z0-9]{4}$/)
    })

    it('uses the resolved sections as validSectionKeys when both sections and fields are provided', async () => {
      const template = makeTemplate()
      mockTemplatesRepository.findById.mockResolvedValue(template as any)
      mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
        Promise.resolve(makeTemplate({ id: template.id, sections: data.sections, fields: data.fields }) as any),
      )

      const result = await useCase.execute(
        template.id,
        {
          sections: [{ key: 'hx_sec', title: 'Histórico', order: 0 }],
          fields: [
            {
              label: 'Queixa',
              type: MedicalRecordFieldType.TEXT,
              required: false,
              order: 0,
              canonical: false,
              sectionKey: 'hx_sec',
            },
          ],
        },
        currentUser,
      )

      expect(result.sections[0].key).toBe('hx_sec')
      expect(result.fields[0].sectionKey).toBe('hx_sec')
    })
  })

  describe('validateSectionKey', () => {
    it('throws UnprocessableEntityException when a field references an unknown sectionKey', async () => {
      const template = makeTemplate()
      mockTemplatesRepository.findById.mockResolvedValue(template as any)

      await expect(
        useCase.execute(
          template.id,
          {
            fields: [
              {
                label: 'Queixa',
                type: MedicalRecordFieldType.TEXT,
                required: false,
                order: 0,
                canonical: false,
                sectionKey: 'nonexistent_key',
              },
            ],
          },
          currentUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockTemplatesRepository.update).not.toHaveBeenCalled()
    })

    it('accepts a field with a sectionKey that matches a key in template.sections', async () => {
      const template = makeTemplate({
        sections: [{ key: 'existing_sec', title: 'Existente', order: 0 }],
      })
      mockTemplatesRepository.findById.mockResolvedValue(template as any)
      mockTemplatesRepository.update.mockImplementation((_id: string, data: any) =>
        Promise.resolve(makeTemplate({ id: template.id, fields: data.fields, sections: template.sections }) as any),
      )

      const result = await useCase.execute(
        template.id,
        {
          fields: [
            {
              label: 'Queixa',
              type: MedicalRecordFieldType.TEXT,
              required: false,
              order: 0,
              canonical: false,
              sectionKey: 'existing_sec',
            },
          ],
        },
        currentUser,
      )

      expect(result.fields[0].sectionKey).toBe('existing_sec')
    })
  })
})
