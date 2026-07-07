import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { FindPrescriptionTemplateByIdUseCase } from '../use-cases/find-prescription-template-by-id.use-case'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const templateId = 'tpl-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeDoctor = (overrides = {}) => ({ id: doctorId, user: { fullName: 'Dr. House' }, ...overrides })

const makeTemplate = (overrides = {}) => ({
  id: templateId,
  clinicId,
  doctorId,
  doctorName: 'Dr. House',
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

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrm: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('FindPrescriptionTemplateByIdUseCase', () => {
  let useCase: FindPrescriptionTemplateByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindPrescriptionTemplateByIdUseCase({} as DataSource, mockRepository, mockDoctorsRepository)
    mockRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
  })

  it('returns template for ADMIN without ownership check', async () => {
    const result = await useCase.execute(templateId, adminUser)

    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
    expect(result.id).toBe(templateId)
  })

  it('returns own template for DOCTOR', async () => {
    const result = await useCase.execute(templateId, doctorUser)

    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(result.id).toBe(templateId)
  })

  it('throws NotFoundException when template not found', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(templateId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor template', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other-doctor' }) as any)

    await expect(useCase.execute(templateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(templateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })
})
