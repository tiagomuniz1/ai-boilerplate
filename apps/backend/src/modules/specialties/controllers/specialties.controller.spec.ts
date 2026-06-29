import { SpecialtiesController } from './specialties.controller'
import { CreateSpecialtyUseCase } from '../use-cases/create-specialty.use-case'
import { FindAllSpecialtiesUseCase } from '../use-cases/find-all-specialties.use-case'
import { FindSpecialtyByIdUseCase } from '../use-cases/find-specialty-by-id.use-case'
import { UpdateSpecialtyUseCase } from '../use-cases/update-specialty.use-case'
import { DeleteSpecialtyUseCase } from '../use-cases/delete-specialty.use-case'
import { SpecialtyListQueryDto } from '../dto/specialty-list-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateSpecialtyUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllSpecialtiesUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindSpecialtyByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateSpecialtyUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteSpecialtyUseCase>

const makeResponse = (overrides = {}) => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  clinicCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('SpecialtiesController', () => {
  let controller: SpecialtiesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new SpecialtiesController(
      mockCreate,
      mockFindAll,
      mockFindById,
      mockUpdate,
      mockDelete,
    )
  })

  it('create delegates to CreateSpecialtyUseCase', async () => {
    const dto = { name: 'Cardiologia' }
    const response = makeResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllSpecialtiesUseCase', async () => {
    const query: SpecialtyListQueryDto = Object.assign(new SpecialtyListQueryDto(), {
      page: 1,
      limit: 20,
    })
    const response = { data: [makeResponse()], total: 1, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(query)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query)
    expect(result).toBe(response)
  })

  it('findAll passes search param through to use case', async () => {
    const query: SpecialtyListQueryDto = Object.assign(new SpecialtyListQueryDto(), {
      page: 1,
      limit: 20,
      search: 'Cardio',
    })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    await controller.findAll(query)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query)
  })

  it('findById delegates to FindSpecialtyByIdUseCase', async () => {
    const response = makeResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('uuid-1')

    expect(mockFindById.execute).toHaveBeenCalledWith('uuid-1')
    expect(result).toBe(response)
  })

  it('update delegates to UpdateSpecialtyUseCase with id and dto', async () => {
    const dto = { name: 'Neurologia' }
    const response = makeResponse({ name: 'Neurologia' })
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('uuid-1', dto as any)

    expect(mockUpdate.execute).toHaveBeenCalledWith('uuid-1', dto)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteSpecialtyUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('uuid-1')

    expect(mockDelete.execute).toHaveBeenCalledWith('uuid-1')
  })
})
