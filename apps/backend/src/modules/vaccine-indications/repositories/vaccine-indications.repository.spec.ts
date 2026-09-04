import { QueryRunner, Repository } from 'typeorm'
import { CouncilType } from '@app/shared'
import { VaccineIndication } from '../entities/vaccine-indication.entity'
import { VaccineIndicationsRepository } from './vaccine-indications.repository'
import { CreateVaccineIndicationData } from './vaccine-indications.repository.interface'

function makeRepo(): jest.Mocked<Repository<VaccineIndication>> {
  return {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<VaccineIndication>>
}

const snapshot = {
    issuedAt: new Date("2026-09-04T12:00:00Z").toISOString(),
    clinic: {
      name: "Clínica Pulso",
      address: { street: "Av Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP", zipCode: "01310-100" },
      logoUrl: null,
    },
    professional: { name: "Dra. Helena Vasconcelos", councilType: CouncilType.CRM, registrationNumber: "12345/SP", registryNumber: null, specialtyName: "Ginecologia e Obstetrícia" },
    patient: { name: "Clara Monteiro Alves", documentNumber: "12345678900" },
    items: [{ vaccineId: "vaccine-uuid", name: "Tríplice viral", abbreviation: "SCR", doseLabel: "1ª dose", instructions: "Aplicar em serviço de imunização" }],
    notes: null,
  }

function makeData(): CreateVaccineIndicationData {
  return {
    clinicId: 'clinic-uuid',
    appointmentId: 'appointment-uuid',
    patientId: 'patient-uuid',
    professionalId: 'professional-uuid',
    snapshot,
    issuedAt: new Date(),
  }
}

describe('VaccineIndicationsRepository', () => {
  let mockRepo: jest.Mocked<Repository<VaccineIndication>>
  let repository: VaccineIndicationsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new VaccineIndicationsRepository(mockRepo)
  })

  it('lista da consulta, da mais recente para a mais antiga', async () => {
    mockRepo.find.mockResolvedValue([])
    await repository.findByAppointment('appointment-uuid', 'clinic-uuid')
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { appointmentId: 'appointment-uuid', clinicId: 'clinic-uuid' },
      order: { issuedAt: 'DESC' },
    })
  })

  // A clínica entra na busca por id: sem isso um uuid vazado leria documento de
  // outro inquilino.
  it('busca por id sempre dentro da clínica', async () => {
    mockRepo.findOneBy.mockResolvedValue(null)
    await repository.findById('indication-uuid', 'clinic-uuid')
    expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 'indication-uuid', clinicId: 'clinic-uuid' })
  })

  it('cria pelo repositório padrão quando não há transação', async () => {
    const data = makeData()
    mockRepo.create.mockReturnValue(data as any)
    mockRepo.save.mockResolvedValue({ id: 'indication-uuid' } as any)

    const result = await repository.create(data)

    expect(mockRepo.create).toHaveBeenCalledWith(data)
    expect(result).toEqual({ id: 'indication-uuid' })
  })

  it('cria pelo QueryRunner quando participa de transação', async () => {
    const data = makeData()
    const txRepo = makeRepo()
    txRepo.create.mockReturnValue(data as any)
    txRepo.save.mockResolvedValue({ id: 'indication-uuid' } as any)
    const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(txRepo) } } as unknown as QueryRunner

    await repository.create(data, queryRunner)

    expect(txRepo.save).toHaveBeenCalled()
    expect(mockRepo.save).not.toHaveBeenCalled()
  })

  it('exclui por soft delete', async () => {
    await repository.delete('indication-uuid')
    expect(mockRepo.softDelete).toHaveBeenCalledWith('indication-uuid')
  })

  it('exclui pelo QueryRunner quando participa de transação', async () => {
    const txRepo = makeRepo()
    const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(txRepo) } } as unknown as QueryRunner
    await repository.delete('indication-uuid', queryRunner)
    expect(txRepo.softDelete).toHaveBeenCalledWith('indication-uuid')
    expect(mockRepo.softDelete).not.toHaveBeenCalled()
  })
})
