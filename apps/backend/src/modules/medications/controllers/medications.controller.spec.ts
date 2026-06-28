import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { MedicationListQueryDto } from '../dto/medication-list-query.dto'
import { MedicationsController } from './medications.controller'
import { CreateMedicationUseCase } from '../use-cases/create-medication.use-case'
import { DeleteMedicationUseCase } from '../use-cases/delete-medication.use-case'
import { FindMedicationsUseCase } from '../use-cases/find-medications.use-case'
import { GetMedicationUseCase } from '../use-cases/get-medication.use-case'
import { UpdateMedicationUseCase } from '../use-cases/update-medication.use-case'

const mockFind = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicationsUseCase>
const mockGet = { execute: jest.fn() } as unknown as jest.Mocked<GetMedicationUseCase>
const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateMedicationUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateMedicationUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteMedicationUseCase>

const currentUser: ICurrentUser = { id: 'p1', role: UserRole.PLATFORM_ADMIN, clinicId: null }

describe('MedicationsController', () => {
  let controller: MedicationsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MedicationsController(mockFind, mockGet, mockCreate, mockUpdate, mockDelete)
  })

  it('findAll delegates to FindMedicationsUseCase with query and user', async () => {
    const query = Object.assign(new MedicationListQueryDto(), { search: 'dipi' })
    const response = { data: [], total: 0, page: 1, limit: 20 } as any
    mockFind.execute.mockResolvedValue(response)

    const result = await controller.findAll(query, currentUser)

    expect(mockFind.execute).toHaveBeenCalledWith(query, currentUser)
    expect(result).toBe(response)
  })

  it('findOne delegates to GetMedicationUseCase with id', async () => {
    const response = { id: 'm1' } as any
    mockGet.execute.mockResolvedValue(response)

    const result = await controller.findOne('m1')

    expect(mockGet.execute).toHaveBeenCalledWith('m1')
    expect(result).toBe(response)
  })

  it('create delegates to CreateMedicationUseCase', async () => {
    const dto = { name: 'Dipirona' } as any
    const response = { id: 'm1' } as any
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateMedicationUseCase with id and dto', async () => {
    const dto = { name: 'Novo' } as any
    const response = { id: 'm1' } as any
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('m1', dto)

    expect(mockUpdate.execute).toHaveBeenCalledWith('m1', dto)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteMedicationUseCase with id', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('m1')

    expect(mockDelete.execute).toHaveBeenCalledWith('m1')
  })
})
