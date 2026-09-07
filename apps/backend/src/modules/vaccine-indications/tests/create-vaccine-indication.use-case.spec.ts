import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IVaccinesRepository } from '../../vaccines/repositories/vaccines.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { CreateVaccineIndicationUseCase } from '../use-cases/create-vaccine-indication.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'professional-uuid'
const patientId = 'patient-uuid'
const appointmentId = 'appointment-uuid'
const specialtyId = 'specialty-uuid'
const vaccineId = 'vaccine-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  clinicId,
  professionalId,
  patientId,
  specialtyId,
  status: AppointmentStatus.SCHEDULED,
  ...overrides,
})

const makeProfessional = (overrides: any = {}) => ({
  id: professionalId,
  user: { fullName: 'Dra. Helena Vasconcelos' },
  registrations: [
    { id: 'crm-1', number: '12345', state: 'SP', councilType: CouncilType.CRM, isPrimary: true },
  ],
  professionalSpecialties: [
    { specialtyId, specialty: { id: specialtyId, name: 'Ginecologia e Obstetrícia' } },
  ],
  ...overrides,
})

const makeVaccine = (overrides = {}) => ({
  id: vaccineId,
  name: 'Tríplice viral',
  abbreviation: 'SCR',
  preventedDiseases: 'sarampo, caxumba, rubéola',
  isActive: true,
  ...overrides,
})

const makePatient = () => ({
  id: patientId,
  user: { fullName: 'Clara Monteiro Alves' },
  documentNumber: '12345678900',
})

const makeClinic = () => ({
  id: clinicId,
  name: 'Clínica Pulso',
  address: {
    street: 'Av Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    country: 'BR',
  },
  logoUrl: null,
})

const mockVaccineIndicationsRepository: jest.Mocked<IVaccineIndicationsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository = { findById: jest.fn() } as unknown as jest.Mocked<IAppointmentsRepository>
const mockProfessionalsRepository = { findByUserId: jest.fn() } as unknown as jest.Mocked<IProfessionalsRepository>
const mockPatientsRepository = { findById: jest.fn() } as unknown as jest.Mocked<IPatientsRepository>
const mockVaccinesRepository = { findById: jest.fn() } as unknown as jest.Mocked<IVaccinesRepository>
const mockFindClinicByIdUseCase = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>
const mockCacheService = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as unknown as jest.Mocked<CacheService>

describe('CreateVaccineIndicationUseCase', () => {
  let useCase: CreateVaccineIndicationUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateVaccineIndicationUseCase(
      {} as DataSource,
      mockVaccineIndicationsRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockPatientsRepository,
      mockVaccinesRepository,
      mockFindClinicByIdUseCase,
      mockCacheService,
    )

    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeProfessional() as any)
    mockPatientsRepository.findById.mockResolvedValue(makePatient() as any)
    mockVaccinesRepository.findById.mockResolvedValue(makeVaccine() as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(makeClinic() as any)
    mockVaccineIndicationsRepository.create.mockImplementation(
      async (data: any) => ({ id: 'indication-uuid', createdAt: new Date(), ...data }) as any,
    )
  })

  const dto = { appointmentId, items: [{ vaccineId, doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' }] }

  it('congela nome, sigla e assinatura no snapshot', async () => {
    const result = await useCase.execute(dto as any, professionalUser)

    const saved = mockVaccineIndicationsRepository.create.mock.calls[0][0]
    expect(saved.snapshot.items).toEqual([
      {
        vaccineId,
        name: 'Tríplice viral',
        abbreviation: 'SCR',
        doseLabel: '1ª dose',
        instructions: 'Aplicar em serviço de imunização',
      },
    ])
    expect(saved.snapshot.professional).toMatchObject({
      name: 'Dra. Helena Vasconcelos',
      councilType: CouncilType.CRM,
      registrationNumber: '12345/SP',
    })
    expect(saved.snapshot.patient).toEqual({ name: 'Clara Monteiro Alves', documentNumber: '12345678900' })
    expect(result.items[0].name).toBe('Tríplice viral')
  })

  // O snapshot é o ponto do documento: renomear a vacina no catálogo depois não
  // pode reescrever o que já foi entregue à paciente.
  it('não vaza id de catálogo como fonte do nome exibido', async () => {
    await useCase.execute(dto as any, professionalUser)
    const saved = mockVaccineIndicationsRepository.create.mock.calls[0][0]
    expect(saved.snapshot.items[0].name).toBe('Tríplice viral')
    expect(mockVaccinesRepository.findById).toHaveBeenCalledWith(vaccineId)
  })

  it('exige ficha: ADMIN sem ficha não indica', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(dto as any, adminUser)).rejects.toThrow(ForbiddenException)
    expect(mockVaccineIndicationsRepository.create).not.toHaveBeenCalled()
  })

  it('ADMIN com ficha, sendo o profissional da consulta, indica', async () => {
    await expect(useCase.execute(dto as any, adminUser)).resolves.toBeDefined()
  })

  // O documento sai com nome, conselho e registro de quem assina.
  it('recusa indicar sobre consulta de outro profissional', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeProfessional({ id: 'outro-id' }) as any)
    await expect(useCase.execute(dto as any, adminUser)).rejects.toThrow(ForbiddenException)
    expect(mockVaccineIndicationsRepository.create).not.toHaveBeenCalled()
  })

  it('recusa consulta cancelada', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(
      makeAppointment({ status: AppointmentStatus.CANCELLED }) as any,
    )
    await expect(useCase.execute(dto as any, professionalUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('404 quando a consulta não existe', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(dto as any, professionalUser)).rejects.toThrow(NotFoundException)
  })

  it('404 quando o paciente não existe', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(dto as any, professionalUser)).rejects.toThrow(NotFoundException)
  })

  it('422 quando a vacina não existe', async () => {
    mockVaccinesRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(dto as any, professionalUser)).rejects.toThrow(UnprocessableEntityException)
  })

  // Desativar existe para tirar de circulação o que não deve mais ser aplicado.
  it('422 quando a vacina está desativada no catálogo', async () => {
    mockVaccinesRepository.findById.mockResolvedValue(makeVaccine({ isActive: false }) as any)
    await expect(useCase.execute(dto as any, professionalUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockVaccineIndicationsRepository.create).not.toHaveBeenCalled()
  })

  it('grava dose e instruções ausentes como nulas', async () => {
    await useCase.execute({ appointmentId, items: [{ vaccineId }] } as any, professionalUser)
    const saved = mockVaccineIndicationsRepository.create.mock.calls[0][0]
    expect(saved.snapshot.items[0].doseLabel).toBeNull()
    expect(saved.snapshot.items[0].instructions).toBeNull()
    expect(saved.snapshot.notes).toBeNull()
  })

  it('aceita clínica sem endereço cadastrado', async () => {
    mockFindClinicByIdUseCase.execute.mockResolvedValue({ id: clinicId, name: 'Clínica Pulso', address: null, logoUrl: null } as any)

    await useCase.execute(dto as any, professionalUser)

    const saved = mockVaccineIndicationsRepository.create.mock.calls[0][0]
    expect(saved.snapshot.clinic.address).toBeNull()
  })

  it('preserva complemento ausente como nulo no endereço congelado', async () => {
    await useCase.execute(dto as any, professionalUser)
    const saved = mockVaccineIndicationsRepository.create.mock.calls[0][0]
    expect(saved.snapshot.clinic.address).toMatchObject({ city: 'São Paulo', complement: null })
  })

  it('invalida o cache da consulta', async () => {
    await useCase.execute(dto as any, professionalUser)
    expect(mockCacheService.del).toHaveBeenCalledWith(`vaccine-indications:appointment:${appointmentId}`)
  })

  it('falha de cache não derruba a emissão', async () => {
    ;(mockCacheService.del as jest.Mock).mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute(dto as any, professionalUser)).resolves.toBeDefined()
  })
})
