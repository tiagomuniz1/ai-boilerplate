import { CouncilType, UserRole } from '@app/shared'
import { ProfessionalsController } from './professionals.controller'
import { CreateProfessionalUseCase } from '../use-cases/create-professional.use-case'
import { FindAllProfessionalsUseCase } from '../use-cases/find-all-professionals.use-case'
import { FindProfessionalByIdUseCase } from '../use-cases/find-professional-by-id.use-case'
import { FindMyProfessionalUseCase } from '../use-cases/find-my-professional.use-case'
import { UpdateProfessionalUseCase } from '../use-cases/update-professional.use-case'
import { DeleteProfessionalUseCase } from '../use-cases/delete-professional.use-case'
import { ListProfessionalsQueryDto } from '../dto/list-professionals-query.dto'
import { ICurrentUser } from '../../auth/types/current-user.type'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateProfessionalUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllProfessionalsUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindProfessionalByIdUseCase>
const mockFindMine = { execute: jest.fn() } as unknown as jest.Mocked<FindMyProfessionalUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProfessionalUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteProfessionalUseCase>

const makeResponse = (overrides = {}) => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. Alice', email: 'alice@clinic.com', isActive: true },
  registrations: [{ id: 'reg-uuid-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const currentUser: ICurrentUser = { id: 'user-uuid-admin', role: UserRole.ADMIN, clinicId: 'clinic-uuid' }

describe('ProfessionalsController', () => {
  let controller: ProfessionalsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ProfessionalsController(
      mockCreate,
      mockFindAll,
      mockFindById,
      mockFindMine,
      mockUpdate,
      mockDelete,
    )
  })

  it('findMine delegates to FindMyProfessionalUseCase', async () => {
    mockFindMine.execute.mockResolvedValue(null)

    const result = await controller.findMine(currentUser)

    expect(mockFindMine.execute).toHaveBeenCalledWith(currentUser)
    expect(result).toBeNull()
  })

  it('create delegates to CreateProfessionalUseCase', async () => {
    const dto = {
      userId: 'user-uuid-1',
      registrations: [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
      specialties: [{ specialtyId: 'spec-uuid-1' }],
    }
    const response = makeResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllProfessionalsUseCase', async () => {
    const query: ListProfessionalsQueryDto = Object.assign(new ListProfessionalsQueryDto(), {
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
    const query: ListProfessionalsQueryDto = Object.assign(new ListProfessionalsQueryDto(), {
      page: 1,
      limit: 20,
      search: 'Cardio',
    })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    await controller.findAll(query, currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query, currentUser)
  })

  it('findById delegates to FindProfessionalByIdUseCase', async () => {
    const response = makeResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('uuid-1', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('uuid-1', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateProfessionalUseCase with id and dto', async () => {
    const dto = { specialties: [{ specialtyId: 'spec-uuid-2' }] }
    const response = makeResponse({ specialties: [{ id: 'spec-uuid-2', name: 'Neurologia', registryNumber: null }] })
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('uuid-1', dto as any, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('uuid-1', dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteProfessionalUseCase with currentUser id', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('uuid-1', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('uuid-1', currentUser)
  })
})
