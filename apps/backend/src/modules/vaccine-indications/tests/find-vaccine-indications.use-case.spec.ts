import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { FindVaccineIndicationsByAppointmentUseCase } from '../use-cases/find-vaccine-indications-by-appointment.use-case'
import { FindVaccineIndicationByIdUseCase } from '../use-cases/find-vaccine-indication-by-id.use-case'
import { DeleteVaccineIndicationUseCase } from '../use-cases/delete-vaccine-indication.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'professional-uuid'
const appointmentId = 'appointment-uuid'
const indicationId = 'indication-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeIndication = (overrides = {}) => ({
  id: indicationId,
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  professionalId,
  issuedAt: new Date(),
  createdAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clínica Pulso', address: null, logoUrl: null },
    professional: { name: 'Dra. Helena', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: null },
    patient: { name: 'Clara Monteiro Alves', documentNumber: '12345678900' },
    items: [{ vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: null }],
    notes: null,
  },
  ...overrides,
})

const repository: jest.Mocked<IVaccineIndicationsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}
const appointments = { findById: jest.fn() } as unknown as jest.Mocked<IAppointmentsRepository>
const professionals = { findByUserId: jest.fn() } as unknown as jest.Mocked<IProfessionalsRepository>
const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as unknown as jest.Mocked<CacheService>

describe('FindVaccineIndicationsByAppointmentUseCase', () => {
  let useCase: FindVaccineIndicationsByAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindVaccineIndicationsByAppointmentUseCase(
      {} as DataSource, repository, appointments, professionals, cache,
    )
    ;(cache.get as jest.Mock).mockResolvedValue(null)
    repository.findByAppointment.mockResolvedValue([makeIndication()] as any)
    appointments.findById.mockResolvedValue({ id: appointmentId, professionalId } as any)
    professionals.findByUserId.mockResolvedValue({ id: professionalId } as any)
  })

  it('devolve as indicações da consulta', async () => {
    const result = await useCase.execute(appointmentId, adminUser)
    expect(result).toHaveLength(1)
    expect(result[0].items[0].name).toBe('Tríplice viral')
  })

  it('serve do cache quando há', async () => {
    ;(cache.get as jest.Mock).mockResolvedValue([{ id: 'do-cache' }])
    const result = await useCase.execute(appointmentId, adminUser)
    expect(result).toEqual([{ id: 'do-cache' }])
    expect(repository.findByAppointment).not.toHaveBeenCalled()
  })

  it('cache indisponível não impede a leitura', async () => {
    ;(cache.get as jest.Mock).mockRejectedValue(new Error('redis down'))
    ;(cache.set as jest.Mock).mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute(appointmentId, adminUser)).resolves.toHaveLength(1)
  })

  // O ADMIN é zelador dos documentos da clínica; o profissional só alcança a
  // própria consulta.
  it('não pede a consulta ao ler como ADMIN', async () => {
    await useCase.execute(appointmentId, adminUser)
    expect(appointments.findById).not.toHaveBeenCalled()
  })

  it('recusa profissional que não é o da consulta', async () => {
    professionals.findByUserId.mockResolvedValue({ id: 'outro-id' } as any)
    await expect(useCase.execute(appointmentId, professionalUser)).rejects.toThrow(ForbiddenException)
  })

  it('recusa profissional sem ficha', async () => {
    professionals.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(appointmentId, professionalUser)).rejects.toThrow(ForbiddenException)
  })

  it('404 quando a consulta não existe', async () => {
    appointments.findById.mockResolvedValue(null)
    await expect(useCase.execute(appointmentId, professionalUser)).rejects.toThrow(NotFoundException)
  })
})

describe('FindVaccineIndicationByIdUseCase', () => {
  let useCase: FindVaccineIndicationByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindVaccineIndicationByIdUseCase({} as DataSource, repository, professionals)
    repository.findById.mockResolvedValue(makeIndication() as any)
    professionals.findByUserId.mockResolvedValue({ id: professionalId } as any)
  })

  it('devolve a indicação', async () => {
    const result = await useCase.execute(indicationId, adminUser)
    expect(result.id).toBe(indicationId)
  })

  it('404 quando não existe', async () => {
    repository.findById.mockResolvedValue(null)
    await expect(useCase.execute(indicationId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('recusa profissional que não emitiu', async () => {
    professionals.findByUserId.mockResolvedValue({ id: 'outro-id' } as any)
    await expect(useCase.execute(indicationId, professionalUser)).rejects.toThrow(ForbiddenException)
  })

  it('recusa profissional sem ficha', async () => {
    professionals.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(indicationId, professionalUser)).rejects.toThrow(ForbiddenException)
  })
})

describe('DeleteVaccineIndicationUseCase', () => {
  let useCase: DeleteVaccineIndicationUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteVaccineIndicationUseCase({} as DataSource, repository, professionals, cache)
    repository.findById.mockResolvedValue(makeIndication() as any)
    professionals.findByUserId.mockResolvedValue({ id: professionalId } as any)
  })

  it('exclui e invalida o cache da consulta', async () => {
    await useCase.execute(indicationId, adminUser)
    expect(repository.delete).toHaveBeenCalledWith(indicationId)
    expect(cache.del).toHaveBeenCalledWith(`vaccine-indications:appointment:${appointmentId}`)
  })

  it('404 quando não existe', async () => {
    repository.findById.mockResolvedValue(null)
    await expect(useCase.execute(indicationId, adminUser)).rejects.toThrow(NotFoundException)
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('recusa profissional que não emitiu', async () => {
    professionals.findByUserId.mockResolvedValue({ id: 'outro-id' } as any)
    await expect(useCase.execute(indicationId, professionalUser)).rejects.toThrow(ForbiddenException)
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('recusa profissional sem ficha', async () => {
    professionals.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(indicationId, professionalUser)).rejects.toThrow(ForbiddenException)
  })

  it('falha de cache não desfaz a exclusão', async () => {
    ;(cache.del as jest.Mock).mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute(indicationId, adminUser)).resolves.toBeUndefined()
    expect(repository.delete).toHaveBeenCalled()
  })
})
