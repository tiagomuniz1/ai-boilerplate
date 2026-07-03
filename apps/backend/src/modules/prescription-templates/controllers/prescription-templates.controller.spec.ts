import { UserRole } from '@app/shared'
import { PrescriptionTemplatesController } from './prescription-templates.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreatePrescriptionTemplateUseCase } from '../use-cases/create-prescription-template.use-case'
import { FindAllPrescriptionTemplatesUseCase } from '../use-cases/find-all-prescription-templates.use-case'
import { FindPrescriptionTemplateByIdUseCase } from '../use-cases/find-prescription-template-by-id.use-case'
import { UpdatePrescriptionTemplateUseCase } from '../use-cases/update-prescription-template.use-case'
import { DeletePrescriptionTemplateUseCase } from '../use-cases/delete-prescription-template.use-case'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreatePrescriptionTemplateUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllPrescriptionTemplatesUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindPrescriptionTemplateByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdatePrescriptionTemplateUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeletePrescriptionTemplateUseCase>

const currentUser: ICurrentUser = { id: 'doctor-uuid', role: UserRole.DOCTOR, clinicId: 'clinic-uuid' }

const makeTemplateResponse = () => ({
  id: 'tpl-uuid',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. House',
  name: 'Modelo A',
  items: [],
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('PrescriptionTemplatesController', () => {
  let controller: PrescriptionTemplatesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new PrescriptionTemplatesController(
      mockCreate,
      mockFindAll,
      mockFindById,
      mockUpdate,
      mockDelete,
    )
  })

  it('create delegates to CreatePrescriptionTemplateUseCase', async () => {
    const dto = { name: 'Modelo A', items: [] }
    const response = makeTemplateResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllPrescriptionTemplatesUseCase with doctorId filter', async () => {
    const response = [makeTemplateResponse()]
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(currentUser, 'doctor-uuid')

    expect(mockFindAll.execute).toHaveBeenCalledWith(currentUser, 'doctor-uuid')
    expect(result).toBe(response)
  })

  it('findAll delegates without doctorId when not provided', async () => {
    const response = [makeTemplateResponse()]
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(currentUser, undefined)
    expect(result).toBe(response)
  })

  it('findById delegates to FindPrescriptionTemplateByIdUseCase', async () => {
    const response = makeTemplateResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('tpl-uuid', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('tpl-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdatePrescriptionTemplateUseCase', async () => {
    const dto = { name: 'Novo nome' }
    const response = makeTemplateResponse()
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('tpl-uuid', dto as any, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('tpl-uuid', dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeletePrescriptionTemplateUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('tpl-uuid', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('tpl-uuid', currentUser)
  })
})
