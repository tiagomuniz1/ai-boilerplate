import { ForbiddenException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { FindAllPrescriptionTemplatesUseCase } from '../use-cases/find-all-prescription-templates.use-case'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeDoctor = (overrides = {}) => ({ id: doctorId, user: { fullName: 'Dr. House' }, ...overrides })

const makeTemplate = (overrides = {}) => ({
  id: 'tpl-uuid',
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

describe('FindAllPrescriptionTemplatesUseCase', () => {
  let useCase: FindAllPrescriptionTemplatesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllPrescriptionTemplatesUseCase({} as DataSource, mockRepository, mockDoctorsRepository)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockRepository.findAll.mockResolvedValue([makeTemplate() as any])
  })

  it('returns own templates for DOCTOR filtered by doctorId', async () => {
    const result = await useCase.execute(doctorUser)

    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockRepository.findAll).toHaveBeenCalledWith(clinicId, doctorId)
    expect(result).toHaveLength(1)
  })

  it('returns all templates for ADMIN without doctorId filter', async () => {
    await useCase.execute(adminUser)

    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
    expect(mockRepository.findAll).toHaveBeenCalledWith(clinicId, undefined)
  })

  it('passes doctorId filter to repository when ADMIN provides it', async () => {
    await useCase.execute(adminUser, doctorId)

    expect(mockRepository.findAll).toHaveBeenCalledWith(clinicId, doctorId)
  })

  it('throws ForbiddenException when DOCTOR has no profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('maps templates to response DTOs', async () => {
    const result = await useCase.execute(adminUser)

    expect(result[0].id).toBe('tpl-uuid')
    expect(result[0].name).toBe('Modelo A')
    expect(result[0].doctorName).toBe('Dr. House')
  })
})
