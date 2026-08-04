import { PatientGender, UserRole } from '@app/shared'
import { PatientsController } from './patients.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreatePatientUseCase } from '../use-cases/create-patient.use-case'
import { ListPatientsUseCase } from '../use-cases/list-patients.use-case'
import { FindPatientByIdUseCase } from '../use-cases/find-patient-by-id.use-case'
import { UpdatePatientUseCase } from '../use-cases/update-patient.use-case'
import { DeletePatientUseCase } from '../use-cases/delete-patient.use-case'
import { ListPatientsQueryDto } from '../dto/list-patients-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreatePatientUseCase>
const mockList = { execute: jest.fn() } as unknown as jest.Mocked<ListPatientsUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindPatientByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdatePatientUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeletePatientUseCase>

const currentUser: ICurrentUser = { id: 'user-uuid-admin', role: UserRole.ADMIN, clinicId: 'clinic-uuid' }

const makeResponse = (overrides = {}) => ({
  id: 'uuid-1',
  user: {
    id: 'user-uuid-1',
    fullName: 'Alice Costa',
    email: 'alice@example.com',
    isActive: false,
  },
  documentNumber: '12345678901',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.FEMALE,
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('PatientsController', () => {
  let controller: PatientsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new PatientsController(mockCreate, mockList, mockFindById, mockUpdate, mockDelete)
  })

  it('create delegates to CreatePatientUseCase', async () => {
    const dto = {
      fullName: 'Alice Costa',
      documentNumber: '12345678901',
      email: 'alice@example.com',
      phoneNumber: '(11) 99999-9999',
      birthDate: '1990-05-15',
      gender: PatientGender.FEMALE,
    }
    const response = makeResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to ListPatientsUseCase', async () => {
    const query: ListPatientsQueryDto = Object.assign(new ListPatientsQueryDto(), { page: 1, limit: 20 })
    const response = { data: [makeResponse()], total: 1, page: 1, limit: 20 }
    mockList.execute.mockResolvedValue(response)

    const result = await controller.findAll(query, currentUser)

    expect(mockList.execute).toHaveBeenCalledWith(query, currentUser)
    expect(result).toBe(response)
  })

  it('findAll passes search param through to use case', async () => {
    const query: ListPatientsQueryDto = Object.assign(new ListPatientsQueryDto(), { page: 1, limit: 20, search: 'alice' })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockList.execute.mockResolvedValue(response)

    await controller.findAll(query, currentUser)

    expect(mockList.execute).toHaveBeenCalledWith(query, currentUser)
  })

  it('findById delegates to FindPatientByIdUseCase', async () => {
    const response = makeResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('uuid-1', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('uuid-1', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdatePatientUseCase with id and dto', async () => {
    const dto = { fullName: 'Alice Updated' }
    const response = makeResponse({ user: { id: 'user-uuid-1', fullName: 'Alice Updated', email: 'alice@example.com', isActive: false } })
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('uuid-1', dto as any, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('uuid-1', dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeletePatientUseCase with currentUser id', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('uuid-1', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('uuid-1', currentUser)
  })
})
