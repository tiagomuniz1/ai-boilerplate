import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CanonicalFieldListQueryDto } from '../dto/canonical-field-list-query.dto'
import { MedicalRecordCanonicalFieldsController } from './medical-record-canonical-fields.controller'
import { CreateCanonicalFieldUseCase } from '../use-cases/create-canonical-field.use-case'
import { FindCanonicalFieldsUseCase } from '../use-cases/find-canonical-fields.use-case'
import { UpdateCanonicalFieldUseCase } from '../use-cases/update-canonical-field.use-case'

const mockFind = { execute: jest.fn() } as unknown as jest.Mocked<FindCanonicalFieldsUseCase>
const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateCanonicalFieldUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateCanonicalFieldUseCase>

const currentUser: ICurrentUser = { id: 'p1', role: UserRole.PLATFORM_ADMIN, clinicId: null }

describe('MedicalRecordCanonicalFieldsController', () => {
  let controller: MedicalRecordCanonicalFieldsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MedicalRecordCanonicalFieldsController(mockFind, mockCreate, mockUpdate)
  })

  it('findAll delegates to FindCanonicalFieldsUseCase with query and user', async () => {
    const query = Object.assign(new CanonicalFieldListQueryDto(), { specialtyId: 'spec-1' })
    const response = [{ id: 'f1' }] as any
    mockFind.execute.mockResolvedValue(response)

    const result = await controller.findAll(query, currentUser)

    expect(mockFind.execute).toHaveBeenCalledWith(query, currentUser)
    expect(result).toBe(response)
  })

  it('create delegates to CreateCanonicalFieldUseCase', async () => {
    const dto = { canonicalKey: 'weight' } as any
    const response = { id: 'f1' } as any
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateCanonicalFieldUseCase with id and dto', async () => {
    const dto = { label: 'New' } as any
    const response = { id: 'f1' } as any
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('f1', dto)

    expect(mockUpdate.execute).toHaveBeenCalledWith('f1', dto)
    expect(result).toBe(response)
  })
})
