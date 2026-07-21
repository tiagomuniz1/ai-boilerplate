import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { FindPrescriptionTemplateByIdUseCase } from '../use-cases/find-prescription-template-by-id.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const templateId = 'tpl-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeDoctor = (overrides = {}) => ({ id: professionalId, user: { fullName: 'Dr. House' }, ...overrides })

const makeTemplate = (overrides = {}) => ({
  id: templateId,
  clinicId,
  professionalId,
  professionalName: 'Dr. House',
  name: 'Modelo A',
  items: [],
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockRepository: jest.Mocked<IPrescriptionTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('FindPrescriptionTemplateByIdUseCase', () => {
  let useCase: FindPrescriptionTemplateByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindPrescriptionTemplateByIdUseCase({} as DataSource, mockRepository, mockProfessionalsRepository)
    mockRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
  })

  it('returns template for ADMIN without ownership check', async () => {
    const result = await useCase.execute(templateId, adminUser)

    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
    expect(result.id).toBe(templateId)
  })

  it('returns own template for DOCTOR', async () => {
    const result = await useCase.execute(templateId, doctorUser)

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(result.id).toBe(templateId)
  })

  it('throws NotFoundException when template not found', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(templateId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor template', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other-doctor' }) as any)

    await expect(useCase.execute(templateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(templateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })
})
