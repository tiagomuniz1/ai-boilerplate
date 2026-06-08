import { ClinicsController } from './clinics.controller'
import { CreateClinicUseCase } from '../use-cases/create-clinic.use-case'
import { FindAllClinicsUseCase } from '../use-cases/find-all-clinics.use-case'
import { FindClinicByIdUseCase } from '../use-cases/find-clinic-by-id.use-case'
import { RegisterClinicUseCase } from '../use-cases/register-clinic.use-case'
import { UpdateClinicUseCase } from '../use-cases/update-clinic.use-case'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'

const mockRegister = { execute: jest.fn() } as unknown as jest.Mocked<RegisterClinicUseCase>
const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateClinicUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllClinicsUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateClinicUseCase>

const makeClinicResponse = (overrides = {}) => ({
  id: 'clinic-uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('ClinicsController', () => {
  let controller: ClinicsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ClinicsController(
      mockCreate,
      mockFindAll,
      mockFindById,
      mockRegister,
      mockUpdate,
    )
  })

  it('register delegates to RegisterClinicUseCase', async () => {
    const dto = {
      clinicName: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
      adminFullName: 'Admin Silva',
      adminEmail: 'admin@clinica.com',
      adminPassword: 'Password123!',
    }
    const response = {
      clinic: makeClinicResponse(),
      admin: { id: 'admin-uuid', fullName: 'Admin Silva', email: 'admin@clinica.com' },
    }
    mockRegister.execute.mockResolvedValue(response as any)

    const result = await controller.register(dto as any)

    expect(mockRegister.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('create delegates to CreateClinicUseCase', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
    const response = makeClinicResponse()
    mockCreate.execute.mockResolvedValue(response as any)

    const result = await controller.create(dto as any)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllClinicsUseCase', async () => {
    const query = Object.assign(new ListClinicsQueryDto(), { page: 1, limit: 20 })
    const response = { data: [makeClinicResponse()], total: 1, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response as any)

    const result = await controller.findAll(query)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query)
    expect(result).toBe(response)
  })

  it('findAll passes search param through to use case', async () => {
    const query = Object.assign(new ListClinicsQueryDto(), { page: 1, limit: 20, search: 'Coracao' })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response as any)

    await controller.findAll(query)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query)
  })

  it('findById delegates to FindClinicByIdUseCase', async () => {
    const response = makeClinicResponse()
    mockFindById.execute.mockResolvedValue(response as any)

    const result = await controller.findById('clinic-uuid-1')

    expect(mockFindById.execute).toHaveBeenCalledWith('clinic-uuid-1')
    expect(result).toBe(response)
  })

  it('update delegates to UpdateClinicUseCase with id and dto', async () => {
    const dto = { name: 'Clínica Nova' }
    const response = makeClinicResponse({ name: 'Clínica Nova' })
    mockUpdate.execute.mockResolvedValue(response as any)

    const result = await controller.update('clinic-uuid-1', dto as any)

    expect(mockUpdate.execute).toHaveBeenCalledWith('clinic-uuid-1', dto)
    expect(result).toBe(response)
  })
})
