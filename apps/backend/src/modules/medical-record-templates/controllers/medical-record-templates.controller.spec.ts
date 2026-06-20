import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { MedicalRecordTemplateListQueryDto } from '../dto/medical-record-template-list-query.dto'
import { MedicalRecordTemplatesController } from './medical-record-templates.controller'
import { CreateMedicalRecordTemplateUseCase } from '../use-cases/create-medical-record-template.use-case'
import { UpdateMedicalRecordTemplateUseCase } from '../use-cases/update-medical-record-template.use-case'
import { FindAllMedicalRecordTemplatesUseCase } from '../use-cases/find-all-medical-record-templates.use-case'
import { FindMedicalRecordTemplateByIdUseCase } from '../use-cases/find-medical-record-template-by-id.use-case'
import { DeleteMedicalRecordTemplateUseCase } from '../use-cases/delete-medical-record-template.use-case'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateMedicalRecordTemplateUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateMedicalRecordTemplateUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllMedicalRecordTemplatesUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalRecordTemplateByIdUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteMedicalRecordTemplateUseCase>

const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId: 'c1' }

describe('MedicalRecordTemplatesController', () => {
  let controller: MedicalRecordTemplatesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MedicalRecordTemplatesController(
      mockCreate,
      mockUpdate,
      mockFindAll,
      mockFindById,
      mockDelete,
    )
  })

  it('create delegates with dto and currentUser', async () => {
    const dto = { specialtyId: 's1' } as any
    const response = { id: 't1' } as any
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates with query and currentUser', async () => {
    const query = Object.assign(new MedicalRecordTemplateListQueryDto(), { specialtyId: 's1' })
    const response = { data: [], total: 0, page: 1, limit: 20 } as any
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(query, currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query, currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates with id and currentUser', async () => {
    const response = { id: 't1' } as any
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('t1', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('t1', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates with id, dto and currentUser', async () => {
    const dto = { name: 'New' } as any
    const response = { id: 't1' } as any
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('t1', dto, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('t1', dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates with id and currentUser', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('t1', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('t1', currentUser)
  })
})
