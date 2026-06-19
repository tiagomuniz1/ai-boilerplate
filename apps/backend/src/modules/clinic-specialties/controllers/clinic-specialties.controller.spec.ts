import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ClinicSpecialtiesController } from './clinic-specialties.controller'
import { FindClinicSpecialtiesUseCase } from '../use-cases/find-clinic-specialties.use-case'
import { LinkSpecialtyToClinicUseCase } from '../use-cases/link-specialty-to-clinic.use-case'
import { UnlinkSpecialtyFromClinicUseCase } from '../use-cases/unlink-specialty-from-clinic.use-case'

const mockLink = { execute: jest.fn() } as unknown as jest.Mocked<LinkSpecialtyToClinicUseCase>
const mockUnlink = { execute: jest.fn() } as unknown as jest.Mocked<UnlinkSpecialtyFromClinicUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicSpecialtiesUseCase>

const platformAdmin: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PLATFORM_ADMIN, clinicId: null }
const clinicAdmin: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: faker.string.uuid() }

const makeSpecialtyResponse = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: faker.string.uuid(),
  specialtyId: faker.string.uuid(),
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date(),
  ...overrides,
})

describe('ClinicSpecialtiesController', () => {
  let controller: ClinicSpecialtiesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ClinicSpecialtiesController(mockLink, mockUnlink, mockFindAll)
  })

  it('findAll delegates to FindClinicSpecialtiesUseCase', async () => {
    const clinicId = faker.string.uuid()
    const query = { page: 1, limit: 20 } as any
    const response = { data: [makeSpecialtyResponse({ clinicId })], total: 1, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response as any)

    const result = await controller.findAll(clinicId, query, platformAdmin)

    expect(mockFindAll.execute).toHaveBeenCalledWith(clinicId, query, platformAdmin)
    expect(result).toBe(response)
  })

  it('findAll passes clinic user context', async () => {
    const clinicId = clinicAdmin.clinicId!
    const query = { page: 1, limit: 20 } as any
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response as any)

    const result = await controller.findAll(clinicId, query, clinicAdmin)

    expect(mockFindAll.execute).toHaveBeenCalledWith(clinicId, query, clinicAdmin)
    expect(result).toBe(response)
  })

  it('link delegates to LinkSpecialtyToClinicUseCase', async () => {
    const clinicId = faker.string.uuid()
    const specialtyId = faker.string.uuid()
    const response = makeSpecialtyResponse({ clinicId, specialtyId })
    mockLink.execute.mockResolvedValue(response as any)

    const result = await controller.link(clinicId, specialtyId)

    expect(mockLink.execute).toHaveBeenCalledWith(clinicId, specialtyId)
    expect(result).toBe(response)
  })

  it('unlink delegates to UnlinkSpecialtyFromClinicUseCase', async () => {
    const clinicId = faker.string.uuid()
    const specialtyId = faker.string.uuid()
    mockUnlink.execute.mockResolvedValue(undefined)

    const result = await controller.unlink(clinicId, specialtyId)

    expect(mockUnlink.execute).toHaveBeenCalledWith(clinicId, specialtyId)
    expect(result).toBeUndefined()
  })
})
