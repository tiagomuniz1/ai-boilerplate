import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { ThemesController } from './themes.controller'
import { CreateThemeUseCase } from '../use-cases/create-theme.use-case'
import { UpdateThemeUseCase } from '../use-cases/update-theme.use-case'
import { DeleteThemeUseCase } from '../use-cases/delete-theme.use-case'
import { FindAllThemesUseCase } from '../use-cases/find-all-themes.use-case'
import { FindThemeByIdUseCase } from '../use-cases/find-theme-by-id.use-case'
import { FindActiveThemeUseCase } from '../use-cases/find-active-theme.use-case'
import type { ICurrentUser } from '../../auth/types/current-user.type'
import { PaginationDto } from '../../../common/dto/pagination.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateThemeUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateThemeUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteThemeUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllThemesUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindThemeByIdUseCase>
const mockFindActive = { execute: jest.fn() } as unknown as jest.Mocked<FindActiveThemeUseCase>

const makeThemeResponse = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Teal Moderno',
  slug: 'teal-moderno',
  isDefault: false,
  accentColor: '#0D9488',
  accentSoftColor: '#CCFBF1',
  borderRadius: 'default',
  bgColor: null,
  bgDarkColor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('ThemesController', () => {
  let controller: ThemesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ThemesController(
      mockCreate,
      mockUpdate,
      mockDelete,
      mockFindAll,
      mockFindById,
      mockFindActive,
    )
  })

  it('getActive delegates to FindActiveThemeUseCase with user clinicId', async () => {
    const currentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: 'clinic-uuid-1' }
    const response = makeThemeResponse()
    mockFindActive.execute.mockResolvedValue(response as any)

    const result = await controller.getActive(currentUser)

    expect(mockFindActive.execute).toHaveBeenCalledWith('clinic-uuid-1')
    expect(result).toBe(response)
  })

  it('getActive passes null clinicId for PLATFORM_ADMIN', async () => {
    const currentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PLATFORM_ADMIN, clinicId: null }
    mockFindActive.execute.mockResolvedValue(null)

    const result = await controller.getActive(currentUser)

    expect(mockFindActive.execute).toHaveBeenCalledWith(null)
    expect(result).toBeNull()
  })

  it('findAll delegates to FindAllThemesUseCase', async () => {
    const query = Object.assign(new PaginationDto(), { page: 1, limit: 20 })
    const response = { data: [makeThemeResponse()], total: 1, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response as any)

    const result = await controller.findAll(query)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query)
    expect(result).toBe(response)
  })

  it('findById delegates to FindThemeByIdUseCase', async () => {
    const response = makeThemeResponse()
    mockFindById.execute.mockResolvedValue(response as any)

    const result = await controller.findById(response.id)

    expect(mockFindById.execute).toHaveBeenCalledWith(response.id)
    expect(result).toBe(response)
  })

  it('create delegates to CreateThemeUseCase', async () => {
    const dto = { name: 'Teal Moderno', accentColor: '#0D9488', accentSoftColor: '#CCFBF1' }
    const response = makeThemeResponse()
    mockCreate.execute.mockResolvedValue(response as any)

    const result = await controller.create(dto as any)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateThemeUseCase with id and dto', async () => {
    const id = faker.string.uuid()
    const dto = { name: 'Updated Name' }
    const response = makeThemeResponse({ id, name: 'Updated Name' })
    mockUpdate.execute.mockResolvedValue(response as any)

    const result = await controller.update(id, dto as any)

    expect(mockUpdate.execute).toHaveBeenCalledWith(id, dto)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteThemeUseCase and returns void', async () => {
    const id = faker.string.uuid()
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete(id)

    expect(mockDelete.execute).toHaveBeenCalledWith(id)
  })
})
