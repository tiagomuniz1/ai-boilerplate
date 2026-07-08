import { DataSource } from 'typeorm'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { FindTemplateByClinicAndSpecialtyUseCase } from '../use-cases/find-template-by-clinic-and-specialty.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('FindTemplateByClinicAndSpecialtyUseCase', () => {
  let useCase: FindTemplateByClinicAndSpecialtyUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindTemplateByClinicAndSpecialtyUseCase({} as DataSource, mockTemplatesRepository)
  })

  it('delegates to the repository and returns the template', async () => {
    const template = { id: 'tpl-1' }
    mockTemplatesRepository.findByClinicAndSpecialty.mockResolvedValue(template as any)

    const result = await useCase.execute('clinic-1', 'spec-1')

    expect(mockTemplatesRepository.findByClinicAndSpecialty).toHaveBeenCalledWith('clinic-1', 'spec-1')
    expect(result).toBe(template as any)
  })

  it('returns null when no template exists', async () => {
    mockTemplatesRepository.findByClinicAndSpecialty.mockResolvedValue(null)

    const result = await useCase.execute('clinic-1', 'spec-1')

    expect(result).toBeNull()
  })

  it('passes a null specialtyId through to resolve the generalist template', async () => {
    const template = { id: 'tpl-generalist' }
    mockTemplatesRepository.findByClinicAndSpecialty.mockResolvedValue(template as any)

    const result = await useCase.execute('clinic-1', null)

    expect(mockTemplatesRepository.findByClinicAndSpecialty).toHaveBeenCalledWith('clinic-1', null)
    expect(result).toBe(template as any)
  })
})
