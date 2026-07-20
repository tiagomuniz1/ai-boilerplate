import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { DeletePrescriptionTemplateUseCase } from '../use-cases/delete-prescription-template.use-case'

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

describe('DeletePrescriptionTemplateUseCase', () => {
  let useCase: DeletePrescriptionTemplateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeletePrescriptionTemplateUseCase({} as DataSource, mockRepository, mockProfessionalsRepository)
    mockRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockRepository.delete.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
  })

  it('deletes template as ADMIN without ownership check', async () => {
    await useCase.execute(templateId, adminUser)

    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
    expect(mockRepository.delete).toHaveBeenCalledWith(templateId)
  })

  it('deletes own template as DOCTOR', async () => {
    await useCase.execute(templateId, doctorUser)

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockRepository.delete).toHaveBeenCalledWith(templateId)
  })

  it('throws NotFoundException when template not found', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(templateId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR deletes another doctor template', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other-doctor' }) as any)

    await expect(useCase.execute(templateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(templateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })
})
