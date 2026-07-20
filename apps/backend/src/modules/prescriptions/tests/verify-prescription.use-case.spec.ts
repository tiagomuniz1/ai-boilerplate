import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { VerifyPrescriptionUseCase } from '../use-cases/verify-prescription.use-case'

const makePrescription = (overrides: Record<string, any> = {}) => ({
  id: 'rx-uuid',
  clinicId: 'clinic-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  professionalId: 'doctor-uuid',
  issuedAt: new Date('2026-01-05T10:00:00.000Z'),
  verificationToken: 'a'.repeat(64),
  snapshot: {
    issuedAt: '2026-01-05T10:00:00.000Z',
    clinic: { name: 'Clínica Saúde', address: null, logoUrl: null },
    doctor: { name: 'Dr. João Silva', crmNumber: '12345/SP', rqe: null, specialtyName: 'Cardiologia' },
    patient: { name: 'Maria Santos', documentNumber: '12345678901' },
    items: [
      {
        medicationId: 'med-uuid',
        name: 'Dipirona',
        activeIngredient: 'dipirona sódica',
        dosage: '500mg',
        quantity: '1 caixa',
        instructions: 'Tomar 1 cp a cada 8 horas',
      },
    ],
    notes: 'Retornar em 7 dias',
    ...(overrides.snapshot ?? {}),
  },
  ...overrides,
})

const mockPrescriptionsRepository: jest.Mocked<IPrescriptionsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  findByVerificationToken: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

describe('VerifyPrescriptionUseCase', () => {
  let useCase: VerifyPrescriptionUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new VerifyPrescriptionUseCase({} as DataSource, mockPrescriptionsRepository)
  })

  it('returns masked prescription data for a valid token', async () => {
    mockPrescriptionsRepository.findByVerificationToken.mockResolvedValue(makePrescription() as any)

    const result = await useCase.execute('a'.repeat(64))

    expect(result).toEqual({
      clinicName: 'Clínica Saúde',
      professionalName: 'Dr. João Silva',
      doctorCrmNumber: '12345/SP',
      specialtyName: 'Cardiologia',
      patientNameMasked: 'Maria S.',
      patientDocumentMasked: '***.***.789-**',
      issuedAt: '2026-01-05T10:00:00.000Z',
      items: [
        { name: 'Dipirona', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa' },
      ],
    })
  })

  it('throws NotFoundException when token does not exist', async () => {
    mockPrescriptionsRepository.findByVerificationToken.mockResolvedValue(null)

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
  })

  it('does not expose instructions, notes or internal ids', async () => {
    mockPrescriptionsRepository.findByVerificationToken.mockResolvedValue(makePrescription() as any)

    const result = await useCase.execute('a'.repeat(64))

    expect(result).not.toHaveProperty('notes')
    expect(result.items[0]).not.toHaveProperty('instructions')
    expect(result.items[0]).not.toHaveProperty('medicationId')
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('patientId')
    expect(result).not.toHaveProperty('professionalId')
  })

  it('masks CPF to *** when it does not have 11 digits', async () => {
    mockPrescriptionsRepository.findByVerificationToken.mockResolvedValue(
      makePrescription({
        snapshot: {
          issuedAt: '2026-01-05T10:00:00.000Z',
          clinic: { name: 'Clínica', address: null, logoUrl: null },
          doctor: { name: 'Dr. X', crmNumber: '1/SP', rqe: null, specialtyName: null },
          patient: { name: 'Ana', documentNumber: '123' },
          items: [],
          notes: null,
        },
      }) as any,
    )

    const result = await useCase.execute('a'.repeat(64))

    expect(result.patientDocumentMasked).toBe('***')
  })

  it('masks a single-word patient name as "First."', async () => {
    mockPrescriptionsRepository.findByVerificationToken.mockResolvedValue(
      makePrescription({
        snapshot: {
          issuedAt: '2026-01-05T10:00:00.000Z',
          clinic: { name: 'Clínica', address: null, logoUrl: null },
          doctor: { name: 'Dr. X', crmNumber: '1/SP', rqe: null, specialtyName: null },
          patient: { name: 'Cher', documentNumber: '12345678901' },
          items: [],
          notes: null,
        },
      }) as any,
    )

    const result = await useCase.execute('a'.repeat(64))

    expect(result.patientNameMasked).toBe('Cher.')
  })

  it('maps items with null dosage/quantity when snapshot omits them', async () => {
    mockPrescriptionsRepository.findByVerificationToken.mockResolvedValue(
      makePrescription({
        snapshot: {
          issuedAt: '2026-01-05T10:00:00.000Z',
          clinic: { name: 'Clínica', address: null, logoUrl: null },
          doctor: { name: 'Dr. X', crmNumber: '1/SP', rqe: null, specialtyName: null },
          patient: { name: 'Ana Lima', documentNumber: '12345678901' },
          items: [{ medicationId: null, name: 'Amoxicilina', activeIngredient: null, instructions: 'Tomar' }],
          notes: null,
        },
      }) as any,
    )

    const result = await useCase.execute('a'.repeat(64))

    expect(result.items[0]).toEqual({
      name: 'Amoxicilina',
      activeIngredient: null,
      dosage: null,
      quantity: null,
    })
  })
})
