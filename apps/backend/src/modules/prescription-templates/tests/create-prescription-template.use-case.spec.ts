import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { CreatePrescriptionTemplateUseCase } from '../use-cases/create-prescription-template.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const medicationId = 'med-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeDoctor = (overrides = {}) => ({
  id: professionalId,
  user: { fullName: 'Dr. House' },
  ...overrides,
})

const makeMedication = (overrides = {}) => ({
  id: medicationId,
  name: 'Dipirona',
  activeIngredient: 'dipirona sódica',
  ...overrides,
})

const makeSavedTemplate = (overrides = {}) => ({
  id: 'tpl-uuid',
  clinicId,
  professionalId,
  professionalName: 'Dr. House',
  name: 'Hipertensão leve',
  items: [{ medicationId, name: 'Dipirona', activeIngredient: 'dipirona sódica', dosage: null, quantity: null, instructions: 'Tomar 1 cp 8/8h' }],
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
  countByClinic: jest.fn(),
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

const baseDto = {
  name: 'Hipertensão leve',
  items: [{ medicationId, instructions: 'Tomar 1 cp 8/8h' }],
}

describe('CreatePrescriptionTemplateUseCase', () => {
  let useCase: CreatePrescriptionTemplateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreatePrescriptionTemplateUseCase(
      {} as DataSource,
      mockRepository,
      mockProfessionalsRepository,
      mockMedicationsRepository,
    )
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockProfessionalsRepository.findById.mockResolvedValue(makeDoctor() as any)
    mockMedicationsRepository.findById.mockResolvedValue(makeMedication() as any)
    mockRepository.create.mockResolvedValue(makeSavedTemplate() as any)
  })

  it('creates template for DOCTOR using own professionalId from session', async () => {
    const result = await useCase.execute(baseDto, doctorUser)

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
    expect(result.professionalId).toBe(professionalId)
    expect(result.name).toBe('Hipertensão leve')
  })

  it('creates template for ADMIN using professionalId from DTO', async () => {
    const result = await useCase.execute({ ...baseDto, professionalId }, adminUser)

    // O professionalId explícito vence a própria ficha: é o ADMIN criando em
    // nome de outro profissional.
    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(professionalId, clinicId)
    expect(result.professionalId).toBe(professionalId)
  })

  it('resolves medication fields from DB when medicationId provided', async () => {
    await useCase.execute(baseDto, doctorUser)

    const createCall = mockRepository.create.mock.calls[0][0]
    expect(createCall.items[0]).toMatchObject({
      medicationId,
      name: 'Dipirona',
      activeIngredient: 'dipirona sódica',
      dosage: null,
      quantity: null,
      instructions: 'Tomar 1 cp 8/8h',
    })
  })

  it('builds item from activeIngredientName without DB lookup', async () => {
    await useCase.execute({ name: 'Modelo livre', items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }] }, doctorUser)

    expect(mockMedicationsRepository.findById).not.toHaveBeenCalled()
    const createCall = mockRepository.create.mock.calls[0][0]
    expect(createCall.items[0]).toMatchObject({
      medicationId: null,
      name: 'Amoxicilina',
      activeIngredient: null,
    })
  })

  it('propagates dosage and quantity to item', async () => {
    await useCase.execute({ name: 'M', items: [{ medicationId, dosage: '500mg', quantity: '2 caixas', instructions: 'Tomar' }] }, doctorUser)

    const createCall = mockRepository.create.mock.calls[0][0]
    expect(createCall.items[0].dosage).toBe('500mg')
    expect(createCall.items[0].quantity).toBe('2 caixas')
  })

  it('sets notes on template when provided', async () => {
    await useCase.execute({ ...baseDto, notes: 'Retornar em 30 dias' }, doctorUser)

    const createCall = mockRepository.create.mock.calls[0][0]
    expect(createCall.notes).toBe('Retornar em 30 dias')
  })

  it('sets notes to null when omitted', async () => {
    await useCase.execute(baseDto, doctorUser)

    const createCall = mockRepository.create.mock.calls[0][0]
    expect(createCall.notes).toBeNull()
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws UnprocessableEntityException when an ADMIN without a professional profile omits professionalId', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  // Uma médica que administra a própria clínica: cria o modelo dela sem ter de
  // se escolher numa lista. Exercer vem da ficha, não do cargo.
  it('creates the template under their own profile for an ADMIN who also practises', async () => {
    const result = await useCase.execute(baseDto, adminUser)

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(adminUser.id, clinicId)
    expect(result.professionalId).toBe(professionalId)
  })

  it('throws NotFoundException when ADMIN provides unknown professionalId', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute({ ...baseDto, professionalId }, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws UnprocessableEntityException when medication not found', async () => {
    mockMedicationsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, doctorUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when item has neither medicationId nor activeIngredientName', async () => {
    await expect(
      useCase.execute({ name: 'M', items: [{ instructions: 'Tomar' } as any] }, doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })
})
