import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { UpdatePrescriptionTemplateUseCase } from '../use-cases/update-prescription-template.use-case'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const templateId = 'tpl-uuid'
const medicationId = 'med-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeDoctor = (overrides = {}) => ({ id: doctorId, user: { fullName: 'Dr. House' }, ...overrides })

const makeMedication = () => ({ id: medicationId, name: 'Dipirona', activeIngredient: 'dipirona sódica' })

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

const mockMedicationsRepository: jest.Mocked<IMedicationsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  bulkUpsert: jest.fn(),
}

describe('UpdatePrescriptionTemplateUseCase', () => {
  let useCase: UpdatePrescriptionTemplateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdatePrescriptionTemplateUseCase(
      {} as DataSource,
      mockRepository,
      mockDoctorsRepository,
      mockMedicationsRepository,
    )
    mockRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockRepository.update.mockResolvedValue(makeTemplate({ name: 'Modelo Atualizado' }) as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockMedicationsRepository.findById.mockResolvedValue(makeMedication() as any)
  })

  it('updates name without re-resolving items', async () => {
    await useCase.execute(templateId, { name: 'Novo nome' }, adminUser)

    expect(mockRepository.update).toHaveBeenCalledWith(templateId, expect.objectContaining({ name: 'Novo nome' }))
    expect(mockMedicationsRepository.findById).not.toHaveBeenCalled()
  })

  it('allows ADMIN to update any template without an owning-doctor check', async () => {
    mockRepository.findById.mockResolvedValue(makeTemplate({ doctorId: 'some-other-doctor' }) as any)

    await useCase.execute(templateId, { name: 'Novo nome' }, adminUser)

    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
    expect(mockRepository.update).toHaveBeenCalled()
  })

  it('re-resolves items from DB when items provided', async () => {
    await useCase.execute(templateId, { items: [{ medicationId, instructions: 'Tomar 1 cp' }] }, adminUser)

    expect(mockMedicationsRepository.findById).toHaveBeenCalledWith(medicationId)
    const updateCall = mockRepository.update.mock.calls[0][1]
    expect(updateCall.items![0].name).toBe('Dipirona')
  })

  it('allows DOCTOR to update own template', async () => {
    await useCase.execute(templateId, { name: 'Novo' }, doctorUser)

    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockRepository.update).toHaveBeenCalled()
  })

  it('throws NotFoundException when template not found', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(templateId, { name: 'X' }, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR updates another doctor template', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other' }) as any)

    await expect(useCase.execute(templateId, { name: 'X' }, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws UnprocessableEntityException when medication not found in items', async () => {
    mockMedicationsRepository.findById.mockResolvedValue(null)

    await expect(
      useCase.execute(templateId, { items: [{ medicationId, instructions: 'Tomar' }] }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('resolves item from activeIngredientName without a medication lookup', async () => {
    await useCase.execute(
      templateId,
      { items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }] },
      adminUser,
    )

    expect(mockMedicationsRepository.findById).not.toHaveBeenCalled()
    const updateCall = mockRepository.update.mock.calls[0][1]
    expect(updateCall.items![0]).toMatchObject({
      medicationId: null,
      name: 'Amoxicilina',
      activeIngredient: null,
    })
  })

  it('throws UnprocessableEntityException when item has neither medicationId nor activeIngredientName', async () => {
    await expect(
      useCase.execute(templateId, { items: [{ instructions: 'Tomar 1 cp' }] } as any, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('updates notes when provided', async () => {
    await useCase.execute(templateId, { notes: 'Retornar em 7 dias' }, adminUser)

    expect(mockRepository.update).toHaveBeenCalledWith(templateId, expect.objectContaining({ notes: 'Retornar em 7 dias' }))
  })

  it('falls back to null when notes is explicitly null', async () => {
    await useCase.execute(templateId, { notes: null } as any, adminUser)

    expect(mockRepository.update).toHaveBeenCalledWith(templateId, expect.objectContaining({ notes: null }))
  })

  it('does not include notes in update payload when omitted', async () => {
    await useCase.execute(templateId, { name: 'Novo nome' }, adminUser)

    const updateCall = mockRepository.update.mock.calls[0][1]
    expect(updateCall).not.toHaveProperty('notes')
  })

  it('updates isActive when provided', async () => {
    await useCase.execute(templateId, { isActive: false }, adminUser)

    expect(mockRepository.update).toHaveBeenCalledWith(templateId, expect.objectContaining({ isActive: false }))
  })
})
