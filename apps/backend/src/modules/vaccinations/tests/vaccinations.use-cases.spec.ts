import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { Vaccination } from '../entities/vaccination.entity'
import { IVaccinationsRepository } from '../repositories/vaccinations.repository.interface'
import { CreateVaccinationUseCase } from '../use-cases/create-vaccination.use-case'
import { DeleteVaccinationUseCase } from '../use-cases/delete-vaccination.use-case'
import { FindVaccinationsUseCase } from '../use-cases/find-vaccinations.use-case'
import { UpdateVaccinationUseCase } from '../use-cases/update-vaccination.use-case'

const CLINIC = 'c1'
const PATIENT = 'p1'
const VACCINE = 'v1'
const PROFESSIONAL = 'prof1'

const mockRepository = {
  findByPatient: jest.fn(),
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as unknown as jest.Mocked<IVaccinationsRepository>

const mockVaccinesRepository = { findById: jest.fn() } as any
const mockPatientsRepository = { findById: jest.fn() } as any
const mockProfessionalsRepository = { findByUserId: jest.fn() } as any
const mockAppointmentsRepository = { findById: jest.fn() } as any
const mockCacheService = {
  get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeVaccination(overrides: Partial<Vaccination> = {}): Vaccination {
  return {
    id: 'vc1',
    clinicId: CLINIC,
    patientId: PATIENT,
    vaccineId: VACCINE,
    vaccine: { id: VACCINE, name: 'Tríplice viral', abbreviation: 'SCR' },
    appointmentId: null,
    recordedByProfessionalId: PROFESSIONAL,
    recordedByProfessional: { id: PROFESSIONAL, user: { fullName: 'Dra. Helena' } },
    doseLabel: '1ª dose',
    appliedAt: '2019-04-12',
    appliedAtOurClinic: false,
    appliedAtDescription: 'UBS Centro',
    lotNumber: null,
    manufacturer: null,
    notes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as Vaccination
}

const admin: ICurrentUser = { id: 'u-admin', role: UserRole.ADMIN, clinicId: CLINIC } as ICurrentUser
const professional: ICurrentUser = { id: 'u-prof', role: UserRole.PROFESSIONAL, clinicId: CLINIC } as ICurrentUser
const receptionist: ICurrentUser = { id: 'u-rec', role: UserRole.USER, clinicId: CLINIC } as ICurrentUser

const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const baseDto = { patientId: PATIENT, vaccineId: VACCINE, doseLabel: '1ª dose', appliedAt: ontem }

describe('Vaccinations use-cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: PROFESSIONAL, user: { fullName: 'Dra. Helena' } })
    mockPatientsRepository.findById.mockResolvedValue({ id: PATIENT })
    mockVaccinesRepository.findById.mockResolvedValue({ id: VACCINE, isActive: true })
    mockRepository.create.mockResolvedValue(makeVaccination())
  })

  describe('CreateVaccinationUseCase', () => {
    let useCase: CreateVaccinationUseCase

    beforeEach(() => {
      useCase = new CreateVaccinationUseCase(
        {} as DataSource, mockRepository, mockVaccinesRepository, mockPatientsRepository,
        mockProfessionalsRepository, mockAppointmentsRepository, mockCacheService,
      )
    })

    // A caderneta transcreve dose tomada em outro serviço: exigir consulta
    // inviabilizaria o caso mais comum.
    it('records a dose with no appointment at all', async () => {
      const result = await useCase.execute(baseDto, professional)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ appointmentId: null, recordedByProfessionalId: PROFESSIONAL }),
      )
      expect(result.recordedByProfessionalName).toBe('Dra. Helena')
    })

    // Exercer vem da ficha, não do cargo — a regra já estabelecida no sistema.
    it('lets an ADMIN who also practises record', async () => {
      await expect(useCase.execute(baseDto, admin)).resolves.toBeDefined()
    })

    it('rejects a user with no professional profile', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

      await expect(useCase.execute(baseDto, admin)).rejects.toThrow(ForbiddenException)
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the patient is not in this clinic', async () => {
      mockPatientsRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(baseDto, professional)).rejects.toThrow(NotFoundException)
    })

    it('rejects a vaccine that is not in the catalogue', async () => {
      mockVaccinesRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(baseDto, professional)).rejects.toThrow(UnprocessableEntityException)
    })

    // Desativada saiu do catálogo por decisão de curadoria; registrar uma dose
    // nova dela reintroduziria pela porta dos fundos.
    it('rejects an inactive vaccine', async () => {
      mockVaccinesRepository.findById.mockResolvedValue({ id: VACCINE, isActive: false })

      await expect(useCase.execute(baseDto, professional)).rejects.toThrow(UnprocessableEntityException)
    })

    // A caderneta registra o que já foi aplicado. Dose planejada é a Fase 2.
    it('rejects a dose dated in the future', async () => {
      await expect(
        useCase.execute({ ...baseDto, appliedAt: amanha }, professional),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('links the appointment when one is given', async () => {
      mockAppointmentsRepository.findById.mockResolvedValue({ id: 'a1', patientId: PATIENT })

      await useCase.execute({ ...baseDto, appointmentId: 'a1' }, professional)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ appointmentId: 'a1' }),
      )
    })

    // Vincular a consulta de outro paciente faria o registro mentir sobre onde
    // nasceu, e o histórico da consulta mostraria dose que não é dali.
    it('rejects an appointment that belongs to another patient', async () => {
      mockAppointmentsRepository.findById.mockResolvedValue({ id: 'a1', patientId: 'outro' })

      await expect(
        useCase.execute({ ...baseDto, appointmentId: 'a1' }, professional),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws NotFoundException for an appointment outside the clinic', async () => {
      mockAppointmentsRepository.findById.mockResolvedValue(null)

      await expect(
        useCase.execute({ ...baseDto, appointmentId: 'a1' }, professional),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('FindVaccinationsUseCase', () => {
    let useCase: FindVaccinationsUseCase

    beforeEach(() => {
      useCase = new FindVaccinationsUseCase(
        {} as DataSource, mockRepository, mockPatientsRepository, mockCacheService,
      )
      mockRepository.findByPatient.mockResolvedValue([[makeVaccination()], 1])
    })

    it('returns the patient booklet, most recent first', async () => {
      const result = await useCase.execute({ page: 1, limit: 20, patientId: PATIENT }, professional)

      expect(result.total).toBe(1)
      expect(result.data[0].vaccineName).toBe('Tríplice viral')
    })

    // Caderneta é dado clínico, na mesma linha do prontuário e das fotos.
    it('refuses a receptionist', async () => {
      await expect(
        useCase.execute({ page: 1, limit: 20, patientId: PATIENT }, receptionist),
      ).rejects.toThrow(ForbiddenException)
    })

    it('requires a patient or an appointment', async () => {
      await expect(useCase.execute({ page: 1, limit: 20 }, professional)).rejects.toThrow(NotFoundException)
    })

    it('lists by appointment without paginating', async () => {
      mockRepository.findByAppointment.mockResolvedValue([makeVaccination()])

      const result = await useCase.execute({ page: 1, limit: 20, appointmentId: 'a1' }, professional)

      expect(mockRepository.findByAppointment).toHaveBeenCalledWith('a1', CLINIC)
      expect(result.total).toBe(1)
    })

    it('throws NotFoundException when the patient is not in this clinic', async () => {
      mockPatientsRepository.findById.mockResolvedValue(null)

      await expect(
        useCase.execute({ page: 1, limit: 20, patientId: PATIENT }, professional),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('UpdateVaccinationUseCase', () => {
    let useCase: UpdateVaccinationUseCase

    beforeEach(() => {
      useCase = new UpdateVaccinationUseCase(
        {} as DataSource, mockRepository, mockProfessionalsRepository, mockCacheService,
      )
      mockRepository.findById.mockResolvedValue(makeVaccination())
      mockRepository.update.mockResolvedValue(makeVaccination({ doseLabel: 'reforço' }))
    })

    // Corrigir a caderneta é zeladoria da clínica, não exercício.
    it('lets an ADMIN correct any record, with no professional profile of their own', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

      const result = await useCase.execute('vc1', { doseLabel: 'reforço' }, admin)

      expect(result.doseLabel).toBe('reforço')
    })

    it('lets the professional correct their own record', async () => {
      await expect(
        useCase.execute('vc1', { doseLabel: 'reforço' }, professional),
      ).resolves.toBeDefined()
    })

    it('refuses a professional on a record someone else made', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'outro-prof' })

      await expect(
        useCase.execute('vc1', { doseLabel: 'reforço' }, professional),
      ).rejects.toThrow(ForbiddenException)
    })

    it('rejects moving a dose into the future', async () => {
      await expect(
        useCase.execute('vc1', { appliedAt: amanha }, admin),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws NotFoundException when it does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute('missing', {}, admin)).rejects.toThrow(NotFoundException)
    })
  })

  describe('DeleteVaccinationUseCase', () => {
    let useCase: DeleteVaccinationUseCase

    beforeEach(() => {
      useCase = new DeleteVaccinationUseCase(
        {} as DataSource, mockRepository, mockProfessionalsRepository, mockCacheService,
      )
      mockRepository.findById.mockResolvedValue(makeVaccination())
    })

    it('lets an ADMIN delete any record', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

      await useCase.execute('vc1', admin)

      expect(mockRepository.delete).toHaveBeenCalledWith('vc1')
    })

    it('refuses a professional on someone else record', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'outro-prof' })

      await expect(useCase.execute('vc1', professional)).rejects.toThrow(ForbiddenException)
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when it does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute('missing', admin)).rejects.toThrow(NotFoundException)
    })
  })
})
