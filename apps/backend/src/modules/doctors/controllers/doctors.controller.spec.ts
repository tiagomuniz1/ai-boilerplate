import { UserRole } from '@app/shared'
import { DoctorsController } from './doctors.controller'
import { CreateDoctorUseCase } from '../use-cases/create-doctor.use-case'
import { FindAllDoctorsUseCase } from '../use-cases/find-all-doctors.use-case'
import { FindDoctorByIdUseCase } from '../use-cases/find-doctor-by-id.use-case'
import { UpdateDoctorUseCase } from '../use-cases/update-doctor.use-case'
import { DeleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'
import { ListDoctorsQueryDto } from '../dto/list-doctors-query.dto'
import { ICurrentUser } from '../../auth/types/current-user.type'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateDoctorUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllDoctorsUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindDoctorByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateDoctorUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteDoctorUseCase>

const makeResponse = (overrides = {}) => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. Alice', email: 'alice@clinic.com', isActive: true },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const currentUser: ICurrentUser = { id: 'user-uuid-admin', role: UserRole.ADMIN, clinicId: 'clinic-uuid' }

describe('DoctorsController', () => {
  let controller: DoctorsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new DoctorsController(
      mockCreate,
      mockFindAll,
      mockFindById,
      mockUpdate,
      mockDelete,
    )
  })

  it('create delegates to CreateDoctorUseCase', async () => {
    const dto = { userId: 'user-uuid-1', crmNumber: '12345/SP', specialtyIds: ['spec-uuid-1'] }
    const response = makeResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllDoctorsUseCase', async () => {
    const query: ListDoctorsQueryDto = Object.assign(new ListDoctorsQueryDto(), {
      page: 1,
      limit: 20,
    })
    const response = { data: [makeResponse()], total: 1, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(query, currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query, currentUser)
    expect(result).toBe(response)
  })

  it('findAll passes search param through to use case', async () => {
    const query: ListDoctorsQueryDto = Object.assign(new ListDoctorsQueryDto(), {
      page: 1,
      limit: 20,
      search: 'Cardio',
    })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    await controller.findAll(query, currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query, currentUser)
  })

  it('findById delegates to FindDoctorByIdUseCase', async () => {
    const response = makeResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('uuid-1', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('uuid-1', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateDoctorUseCase with id and dto', async () => {
    const dto = { specialtyIds: ['spec-uuid-2'] }
    const response = makeResponse({ specialties: [{ id: 'spec-uuid-2', name: 'Neurologia' }] })
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('uuid-1', dto as any, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('uuid-1', dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteDoctorUseCase with currentUser id', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('uuid-1', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('uuid-1', currentUser)
  })
})
