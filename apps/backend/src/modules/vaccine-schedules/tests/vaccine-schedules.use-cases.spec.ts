import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PatientGender, UserRole, VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateScheduleRuleUseCase } from '../use-cases/create-schedule-rule.use-case'
import { DeleteScheduleRuleUseCase } from '../use-cases/delete-schedule-rule.use-case'
import { GetPatientVaccineStatusUseCase } from '../use-cases/get-patient-vaccine-status.use-case'
import { RecordVaccineDecisionUseCase } from '../use-cases/record-vaccine-decision.use-case'
import { UpdateScheduleRuleUseCase } from '../use-cases/update-schedule-rule.use-case'

const CLINIC = 'c1'
const PATIENT = 'p1'
const VACCINE = 'v1'

const mockRules = {
  findAll: jest.fn(), findAllActive: jest.fn(), findById: jest.fn(),
  findByVaccineAndOrder: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
} as any
const mockDecisions = {
  findByPatient: jest.fn(), findByPatientAndVaccine: jest.fn(), create: jest.fn(), delete: jest.fn(),
} as any
const mockVaccines = { findById: jest.fn() } as any
const mockPatients = { findById: jest.fn() } as any
const mockProfessionals = { findByUserId: jest.fn() } as any
const mockVaccinations = { findByPatient: jest.fn() } as any
const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() } as unknown as jest.Mocked<CacheService>

const admin: ICurrentUser = { id: 'u-admin', role: UserRole.ADMIN, clinicId: CLINIC } as ICurrentUser
const professional: ICurrentUser = { id: 'u-prof', role: UserRole.PROFESSIONAL, clinicId: CLINIC } as ICurrentUser
const receptionist: ICurrentUser = { id: 'u-rec', role: UserRole.USER, clinicId: CLINIC } as ICurrentUser

function makeRule(overrides = {}) {
  return {
    id: 'r1', vaccineId: VACCINE, vaccine: { id: VACCINE, name: 'Tríplice viral', abbreviation: 'SCR', isActive: true },
    doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 12, maxAgeMonths: null,
    minIntervalDays: null, appliesToGender: null, isActive: true,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), deletedAt: null,
    ...overrides,
  } as never
}

describe('Vaccine schedules use-cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCache.get.mockResolvedValue(null)
  })

  describe('CreateScheduleRuleUseCase', () => {
    let useCase: CreateScheduleRuleUseCase

    beforeEach(() => {
      useCase = new CreateScheduleRuleUseCase({} as DataSource, mockRules, mockVaccines, mockCache)
      mockVaccines.findById.mockResolvedValue({ id: VACCINE, isActive: true })
      mockRules.findByVaccineAndOrder.mockResolvedValue(null)
      mockRules.create.mockResolvedValue(makeRule())
    })

    it('creates the rule and invalidates every cached status', async () => {
      const result = await useCase.execute({
        vaccineId: VACCINE, doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 12,
      })

      expect(result.doseLabel).toBe('1ª dose')
      // Mudar o calendário muda o que TODO paciente deve — não dá para
      // invalidar só um.
      expect(mockCache.delByPattern).toHaveBeenCalledWith('vaccine_status:*')
    })

    it('rejects a vaccine outside the catalogue', async () => {
      mockVaccines.findById.mockResolvedValue(null)

      await expect(
        useCase.execute({ vaccineId: 'x', doseLabel: '1ª', doseOrder: 1, minAgeMonths: 0 }),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    // Duas regras na mesma ordem tornariam ambígua a pergunta "qual é a próxima".
    it('rejects a duplicate dose order for the same vaccine', async () => {
      mockRules.findByVaccineAndOrder.mockResolvedValue(makeRule())

      await expect(
        useCase.execute({ vaccineId: VACCINE, doseLabel: '1ª', doseOrder: 1, minAgeMonths: 12 }),
      ).rejects.toThrow(ConflictException)
    })

    // Janela invertida deixaria a dose impossível e sempre atrasada.
    it('rejects a maximum age below the minimum', async () => {
      await expect(
        useCase.execute({
          vaccineId: VACCINE, doseLabel: '1ª', doseOrder: 1, minAgeMonths: 24, maxAgeMonths: 12,
        }),
      ).rejects.toThrow(UnprocessableEntityException)
    })
  })

  describe('UpdateScheduleRuleUseCase', () => {
    let useCase: UpdateScheduleRuleUseCase

    beforeEach(() => {
      useCase = new UpdateScheduleRuleUseCase({} as DataSource, mockRules, mockCache)
      mockRules.findById.mockResolvedValue(makeRule())
      mockRules.update.mockResolvedValue(makeRule({ isActive: false }))
    })

    it('updates and invalidates the cached statuses', async () => {
      const result = await useCase.execute('r1', { isActive: false })

      expect(result.isActive).toBe(false)
      expect(mockCache.delByPattern).toHaveBeenCalledWith('vaccine_status:*')
    })

    it('throws NotFoundException when the rule does not exist', async () => {
      mockRules.findById.mockResolvedValue(null)

      await expect(useCase.execute('missing', {})).rejects.toThrow(NotFoundException)
    })

    it('validates the window against the stored minimum when only the max changes', async () => {
      await expect(useCase.execute('r1', { maxAgeMonths: 6 })).rejects.toThrow(
        UnprocessableEntityException,
      )
    })
  })

  describe('DeleteScheduleRuleUseCase', () => {
    it('soft deletes and invalidates', async () => {
      const useCase = new DeleteScheduleRuleUseCase({} as DataSource, mockRules, mockCache)
      mockRules.findById.mockResolvedValue(makeRule())

      await useCase.execute('r1')

      expect(mockRules.delete).toHaveBeenCalledWith('r1')
      expect(mockCache.delByPattern).toHaveBeenCalledWith('vaccine_status:*')
    })
  })

  describe('GetPatientVaccineStatusUseCase', () => {
    let useCase: GetPatientVaccineStatusUseCase

    beforeEach(() => {
      useCase = new GetPatientVaccineStatusUseCase(
        {} as DataSource, mockRules, mockVaccinations, mockDecisions, mockPatients, mockCache,
      )
      mockPatients.findById.mockResolvedValue({
        id: PATIENT, birthDate: '2020-01-01', gender: PatientGender.FEMALE,
      })
      mockRules.findAllActive.mockResolvedValue([makeRule()])
      mockVaccinations.findByPatient.mockResolvedValue([[], 0])
      mockDecisions.findByPatient.mockResolvedValue([])
    })

    it('reports what is pending for the patient', async () => {
      const result = await useCase.execute(PATIENT, professional)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe(VaccineScheduleStatus.PENDENTE)
      expect(result.items[0].vaccineName).toBe('Tríplice viral')
      expect(result.ageInMonths).toBeGreaterThan(0)
    })

    // Situação vacinal é dado clínico, como a caderneta.
    it('refuses a receptionist', async () => {
      await expect(useCase.execute(PATIENT, receptionist)).rejects.toThrow(ForbiddenException)
    })

    it('throws NotFoundException for a patient outside the clinic', async () => {
      mockPatients.findById.mockResolvedValue(null)

      await expect(useCase.execute(PATIENT, professional)).rejects.toThrow(NotFoundException)
    })

    // A idade avança sozinha à meia-noite: sem o dia na chave, a situação de
    // ontem seria servida hoje.
    it('keys the cache by day', async () => {
      const hoje = new Date().toISOString().slice(0, 10)

      await useCase.execute(PATIENT, professional)

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining(hoje),
        expect.anything(),
        300,
      )
    })

    it('carries the decision and who made it into the response', async () => {
      mockDecisions.findByPatient.mockResolvedValue([
        {
          vaccineId: VACCINE,
          decision: VaccineDecision.DISPENSADA,
          reason: 'Contraindicação',
          decidedByProfessional: { user: { fullName: 'Dra. Helena' } },
        },
      ])

      const result = await useCase.execute(PATIENT, professional)

      expect(result.items[0].status).toBe(VaccineScheduleStatus.NAO_SE_APLICA)
      expect(result.items[0].decisionReason).toBe('Contraindicação')
      expect(result.items[0].decidedByProfessionalName).toBe('Dra. Helena')
    })
  })

  describe('RecordVaccineDecisionUseCase', () => {
    let useCase: RecordVaccineDecisionUseCase

    beforeEach(() => {
      useCase = new RecordVaccineDecisionUseCase(
        {} as DataSource, mockDecisions, mockVaccines, mockPatients, mockProfessionals, mockCache,
      )
      mockProfessionals.findByUserId.mockResolvedValue({ id: 'prof1', user: { fullName: 'Dra. Helena' } })
      mockPatients.findById.mockResolvedValue({ id: PATIENT })
      mockVaccines.findById.mockResolvedValue({ id: VACCINE, isActive: true })
      mockDecisions.findByPatientAndVaccine.mockResolvedValue(null)
      mockDecisions.create.mockResolvedValue({
        id: 'd1', patientId: PATIENT, vaccineId: VACCINE,
        decision: VaccineDecision.DISPENSADA, reason: 'Contraindicação',
        decidedByProfessional: { user: { fullName: 'Dra. Helena' } },
        createdAt: new Date(),
      })
    })

    // Decidir sobre esquema vacinal é ato clínico: exige ficha.
    it('refuses an ADMIN with no professional profile', async () => {
      mockProfessionals.findByUserId.mockResolvedValue(null)

      await expect(
        useCase.execute(
          { patientId: PATIENT, vaccineId: VACCINE, decision: VaccineDecision.DISPENSADA, reason: 'x' },
          admin,
        ),
      ).rejects.toThrow(ForbiddenException)
    })

    // Sem motivo, ninguém depois sabe por que a pendência sumiu da tela.
    it('requires a reason to waive', async () => {
      await expect(
        useCase.execute(
          { patientId: PATIENT, vaccineId: VACCINE, decision: VaccineDecision.DISPENSADA },
          professional,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('requires a reason to postpone', async () => {
      await expect(
        useCase.execute(
          { patientId: PATIENT, vaccineId: VACCINE, decision: VaccineDecision.ADIADA, reason: '   ' },
          professional,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    // Confirmar é só reconhecer o que o calendário disse: não precisa justificar.
    it('accepts confirming with no reason', async () => {
      mockDecisions.create.mockResolvedValue({
        id: 'd1', patientId: PATIENT, vaccineId: VACCINE,
        decision: VaccineDecision.CONFIRMADA, reason: null,
        decidedByProfessional: { user: { fullName: 'Dra. Helena' } },
        createdAt: new Date(),
      })

      await expect(
        useCase.execute(
          { patientId: PATIENT, vaccineId: VACCINE, decision: VaccineDecision.CONFIRMADA },
          professional,
        ),
      ).resolves.toBeDefined()
    })

    // Uma decisão vigente por par: a nova substitui, a antiga vira histórico.
    it('replaces the standing decision for the same patient and vaccine', async () => {
      mockDecisions.findByPatientAndVaccine.mockResolvedValue({ id: 'antiga' })

      await useCase.execute(
        { patientId: PATIENT, vaccineId: VACCINE, decision: VaccineDecision.DISPENSADA, reason: 'x' },
        professional,
      )

      expect(mockDecisions.delete).toHaveBeenCalledWith('antiga')
      expect(mockDecisions.create).toHaveBeenCalled()
    })

    it('invalidates only this patient cached status', async () => {
      await useCase.execute(
        { patientId: PATIENT, vaccineId: VACCINE, decision: VaccineDecision.DISPENSADA, reason: 'x' },
        professional,
      )

      expect(mockCache.delByPattern).toHaveBeenCalledWith(`vaccine_status:${CLINIC}:${PATIENT}*`)
    })
  })
})
