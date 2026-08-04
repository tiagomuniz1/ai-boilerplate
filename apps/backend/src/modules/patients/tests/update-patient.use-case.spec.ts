import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender, UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { UpdatePatientUseCase } from '../use-cases/update-patient.use-case'

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('UPDATE', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
  findActiveDependents: jest.fn().mockResolvedValue([]),
  findResponsiblePatientsByIds: jest.fn().mockResolvedValue([]),
  findDependentsByResponsibleIds: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updatePassword: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { getRepository: jest.fn() },
  }),
} as unknown as DataSource

const makeUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: 'hashed',
  role: UserRole.PATIENT,
  isActive: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makePatient = (overrides = {}) => {
  const user = makeUser()
  return {
    id: faker.string.uuid(),
    user,
    userId: user.id,
    documentNumber: '12345678901',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    gender: PatientGender.MALE,
    responsiblePatientId: null,
    kinshipType: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('UpdatePatientUseCase', () => {
  let useCase: UpdatePatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdatePatientUseCase(
      mockDataSource,
      mockPatientsRepository,
      mockUsersRepository,
      mockCacheService,
    )
  })

  it('updates patient fields and returns response', async () => {
    const patient = makePatient()
    const updated = { ...patient, phoneNumber: '(11) 88888-8888' }

    mockPatientsRepository.findById
      .mockResolvedValueOnce(patient as any)
      .mockResolvedValueOnce(updated as any)
    mockPatientsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, { phoneNumber: '(11) 88888-8888' }, adminCurrentUser)

    expect(mockPatientsRepository.update).toHaveBeenCalledWith(patient.id, { phoneNumber: '(11) 88888-8888' })
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
    expect(result.phoneNumber).toBe('(11) 88888-8888')
    expect(result).not.toHaveProperty('version')
  })

  it('updates user fields when fullName is provided', async () => {
    const patient = makePatient()
    const updatedUser = { ...patient.user, fullName: 'Novo Nome' }
    const updatedPatient = { ...patient, user: updatedUser }

    mockPatientsRepository.findById
      .mockResolvedValueOnce(patient as any)
      .mockResolvedValueOnce(updatedPatient as any)
    mockUsersRepository.update.mockResolvedValue(updatedUser as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, { fullName: 'Novo Nome' }, adminCurrentUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      patient.userId,
      expect.objectContaining({ fullName: 'Novo Nome' }),
    )
    expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    expect(result.user.fullName).toBe('Novo Nome')
  })

  it('throws NotFoundException when patient does not exist', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { phoneNumber: '(11) 99999-9999' }, adminCurrentUser)).rejects.toThrow(
      NotFoundException,
    )
    expect(mockPatientsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException when new email is already in use', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.findByEmail.mockResolvedValue(makeUser() as any)

    await expect(useCase.execute(patient.id, { email: 'taken@example.com' }, adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('does not check email uniqueness when email is unchanged', async () => {
    const patient = makePatient()
    const updatedPatient = { ...patient, user: { ...patient.user, fullName: 'Outro Nome' } }

    mockPatientsRepository.findById
      .mockResolvedValueOnce(patient as any)
      .mockResolvedValueOnce(updatedPatient as any)
    mockUsersRepository.update.mockResolvedValue(updatedPatient.user as any)

    await useCase.execute(patient.id, { email: patient.user.email, fullName: 'Outro Nome' }, adminCurrentUser)

    expect(mockUsersRepository.findByEmail).not.toHaveBeenCalled()
  })

  it('runs both user and patient updates inside a transaction when both fields are present', async () => {
    const patient = makePatient()
    const updatedPatient = {
      ...patient,
      phoneNumber: '(11) 77777-7777',
      user: { ...patient.user, fullName: 'New Name' },
    }

    mockPatientsRepository.findById
      .mockResolvedValueOnce(patient as any)
      .mockResolvedValueOnce(updatedPatient as any)
    mockUsersRepository.update.mockResolvedValue(updatedPatient.user as any)
    mockPatientsRepository.update.mockResolvedValue(updatedPatient as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, {
      fullName: 'New Name',
      phoneNumber: '(11) 77777-7777',
    }, adminCurrentUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      patient.userId,
      expect.objectContaining({ fullName: 'New Name' }),
      expect.anything(),
    )
    expect(mockPatientsRepository.update).toHaveBeenCalledWith(
      patient.id,
      expect.objectContaining({ phoneNumber: '(11) 77777-7777' }),
      expect.anything(),
    )
    expect(result.phoneNumber).toBe('(11) 77777-7777')
  })

  it('throws ConflictException when OptimisticLock is triggered inside transaction', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.update.mockResolvedValue(patient.user as any)
    mockPatientsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('Patient', 1, 2),
    )

    await expect(
      useCase.execute(patient.id, { fullName: 'New Name', phoneNumber: '(11) 99999-9999' }, adminCurrentUser),
    ).rejects.toThrow(ConflictException)
  })

  it('rethrows non-optimistic errors from patientsRepository inside transaction', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.update.mockResolvedValue(patient.user as any)
    mockPatientsRepository.update.mockRejectedValue(new Error('DB failure inside transaction'))

    await expect(
      useCase.execute(patient.id, { fullName: 'New Name', phoneNumber: '(11) 99999-9999' }, adminCurrentUser),
    ).rejects.toThrow('DB failure inside transaction')
  })

  it('throws ConflictException on OptimisticLockVersionMismatchError', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('Patient', 1, 2))

    await expect(useCase.execute(patient.id, { phoneNumber: '(11) 99999-9999' }, adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('propagates non-optimistic-lock errors', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockRejectedValue(new Error('Database error'))

    await expect(useCase.execute(patient.id, { phoneNumber: '(11) 99999-9999' }, adminCurrentUser)).rejects.toThrow('Database error')
  })

  it('invalidates patient and list cache when updating patient-only fields', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockResolvedValue(patient as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id, { phoneNumber: '(11) 99999-9999' }, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${CLINIC_ID}:${patient.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`patients:list:${CLINIC_ID}*`)
    expect(mockCacheService.del).not.toHaveBeenCalledWith(`user:${CLINIC_ID}:${patient.userId}`)
    expect(mockCacheService.delByPattern).not.toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('also invalidates user caches when fullName is updated', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.update.mockResolvedValue(patient.user as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id, { fullName: 'Nome Atualizado' }, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${CLINIC_ID}:${patient.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`patients:list:${CLINIC_ID}*`)
    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${patient.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('also invalidates user caches when email is updated', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.update.mockResolvedValue(patient.user as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id, { email: 'new@email.com' }, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${patient.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('throws ConflictException when OptimisticLock fires on user-only update', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('User', 1, 2))

    await expect(useCase.execute(patient.id, { fullName: 'New Name' }, adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException when OptimisticLock fires on user update inside transaction', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('User', 1, 2))

    await expect(
      useCase.execute(patient.id, { fullName: 'New Name', phoneNumber: '(11) 99999-9999' }, adminCurrentUser),
    ).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException when DB email unique constraint fires on user-only update (race condition)', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.update.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC))

    await expect(useCase.execute(patient.id, { email: 'race@example.com' }, adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException when DB email unique constraint fires inside transaction (race condition)', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.update.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC))

    await expect(
      useCase.execute(patient.id, { email: 'race@example.com', phoneNumber: '(11) 99999-9999' }, adminCurrentUser),
    ).rejects.toThrow(ConflictException)
  })

  it('continues and returns response when cache invalidation fails', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockResolvedValue(patient as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(patient.id, { phoneNumber: '(11) 99999-9999' }, adminCurrentUser)

    expect(result.id).toBe(patient.id)
  })

  describe('kinship link', () => {
    it('promotes a dependent to independent when documentNumber is set and responsiblePatientId is cleared', async () => {
      const responsible = makePatient()
      const patient = makePatient({ documentNumber: null, responsiblePatientId: responsible.id, kinshipType: 'filho' })
      const updated = { ...patient, documentNumber: '98765432100', responsiblePatientId: null, kinshipType: null }

      mockPatientsRepository.findById.mockResolvedValueOnce(patient as any).mockResolvedValueOnce(updated as any)
      mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
      mockPatientsRepository.update.mockResolvedValue(updated as any)
      mockPatientsRepository.findActiveDependents.mockResolvedValue([])
      mockCacheService.del.mockResolvedValue(undefined)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(
        patient.id,
        { documentNumber: '98765432100', responsiblePatientId: null },
        adminCurrentUser,
      )

      expect(mockPatientsRepository.update).toHaveBeenCalledWith(
        patient.id,
        expect.objectContaining({ documentNumber: '98765432100', responsiblePatientId: null, kinshipType: null }),
      )
      expect(result.documentNumber).toBe('98765432100')
      expect(result.responsiblePatientId).toBeNull()
      expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${CLINIC_ID}:${responsible.id}`)
    })

    it('throws UnprocessableEntityException when clearing responsiblePatientId without a resulting documentNumber', async () => {
      const patient = makePatient({ documentNumber: null, responsiblePatientId: faker.string.uuid(), kinshipType: 'filho' })
      mockPatientsRepository.findById.mockResolvedValue(patient as any)

      await expect(
        useCase.execute(patient.id, { responsiblePatientId: null }, adminCurrentUser),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws UnprocessableEntityException when linking a patient to itself', async () => {
      const patient = makePatient()
      mockPatientsRepository.findById.mockResolvedValue(patient as any)

      await expect(
        useCase.execute(patient.id, { responsiblePatientId: patient.id, kinshipType: 'filho' as any }, adminCurrentUser),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the new responsible patient does not exist', async () => {
      const patient = makePatient()
      mockPatientsRepository.findById.mockResolvedValueOnce(patient as any).mockResolvedValueOnce(null)

      await expect(
        useCase.execute(
          patient.id,
          { responsiblePatientId: faker.string.uuid(), kinshipType: 'filho' as any },
          adminCurrentUser,
        ),
      ).rejects.toThrow(NotFoundException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws UnprocessableEntityException when the new responsible patient is itself a dependent', async () => {
      const patient = makePatient()
      const otherDependentsResponsible = makePatient({ responsiblePatientId: faker.string.uuid(), kinshipType: 'filho' })
      mockPatientsRepository.findById
        .mockResolvedValueOnce(patient as any)
        .mockResolvedValueOnce(otherDependentsResponsible as any)

      await expect(
        useCase.execute(
          patient.id,
          { responsiblePatientId: otherDependentsResponsible.id, kinshipType: 'filho' as any },
          adminCurrentUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws UnprocessableEntityException when kinshipType is missing while setting responsiblePatientId', async () => {
      const patient = makePatient()
      const responsible = makePatient()
      mockPatientsRepository.findById.mockResolvedValueOnce(patient as any).mockResolvedValueOnce(responsible as any)

      await expect(
        useCase.execute(patient.id, { responsiblePatientId: responsible.id }, adminCurrentUser),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws ConflictException when linking a patient that already has its own dependents', async () => {
      const patient = makePatient()
      const responsible = makePatient()
      mockPatientsRepository.findById.mockResolvedValueOnce(patient as any).mockResolvedValueOnce(responsible as any)
      mockPatientsRepository.findActiveDependents.mockResolvedValue([makePatient() as any])

      await expect(
        useCase.execute(
          patient.id,
          { responsiblePatientId: responsible.id, kinshipType: 'filho' as any },
          adminCurrentUser,
        ),
      ).rejects.toThrow(ConflictException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws ConflictException when the new documentNumber is already in use by another patient', async () => {
      const patient = makePatient({ documentNumber: null })
      mockPatientsRepository.findById.mockResolvedValue(patient as any)
      mockPatientsRepository.findByDocumentNumber.mockResolvedValue(makePatient() as any)

      await expect(
        useCase.execute(patient.id, { documentNumber: '11122233344' }, adminCurrentUser),
      ).rejects.toThrow(ConflictException)
      expect(mockPatientsRepository.update).not.toHaveBeenCalled()
    })

    it('throws ConflictException when DB document_number unique constraint fires (race condition)', async () => {
      const patient = makePatient({ documentNumber: null })
      mockPatientsRepository.findById.mockResolvedValue(patient as any)
      mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
      mockPatientsRepository.update.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT))

      await expect(
        useCase.execute(patient.id, { documentNumber: '11122233344' }, adminCurrentUser),
      ).rejects.toThrow(ConflictException)
    })

    it('successfully links a patient to a new responsible patient and populates the response', async () => {
      const patient = makePatient()
      const responsible = makePatient()
      const updated = { ...patient, responsiblePatientId: responsible.id, kinshipType: 'filho' }

      mockPatientsRepository.findById
        .mockResolvedValueOnce(patient as any)
        .mockResolvedValueOnce(responsible as any)
        .mockResolvedValueOnce(updated as any)
        .mockResolvedValueOnce(responsible as any)
      mockPatientsRepository.findActiveDependents.mockResolvedValue([])
      mockPatientsRepository.update.mockResolvedValue(updated as any)
      mockCacheService.del.mockResolvedValue(undefined)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(
        patient.id,
        { responsiblePatientId: responsible.id, kinshipType: 'filho' as any },
        adminCurrentUser,
      )

      expect(result.responsiblePatientId).toBe(responsible.id)
      expect(result.responsiblePatient).toEqual({
        id: responsible.id,
        fullName: responsible.user.fullName,
        documentNumber: responsible.documentNumber,
      })
      expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${CLINIC_ID}:${responsible.id}`)
    })

    it('populates dependents in the response when the patient already has active dependents', async () => {
      const patient = makePatient()
      const dependent = makePatient({ responsiblePatientId: patient.id, kinshipType: 'filho' })

      mockPatientsRepository.findById.mockResolvedValue(patient as any)
      mockPatientsRepository.update.mockResolvedValue(patient as any)
      mockPatientsRepository.findActiveDependents.mockResolvedValue([dependent as any])
      mockCacheService.del.mockResolvedValue(undefined)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(patient.id, { phoneNumber: '(11) 91111-1111' }, adminCurrentUser)

      expect(result.dependents).toEqual([
        { id: dependent.id, fullName: dependent.user.fullName, kinshipType: 'filho' },
      ])
    })
  })
})
