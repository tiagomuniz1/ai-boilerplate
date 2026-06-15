import { UnauthorizedException } from '@nestjs/common'
import { UserRole } from '@app/shared'
import { ClinicsController } from './clinics.controller'
import { CreateClinicUseCase } from '../use-cases/create-clinic.use-case'
import { FindAllClinicsUseCase } from '../use-cases/find-all-clinics.use-case'
import { FindClinicByIdUseCase } from '../use-cases/find-clinic-by-id.use-case'
import { FindClinicBySlugUseCase } from '../use-cases/find-clinic-by-slug.use-case'
import { RegisterClinicUseCase } from '../use-cases/register-clinic.use-case'
import { UpdateClinicUseCase } from '../use-cases/update-clinic.use-case'
import { UploadClinicLogoUseCase } from '../use-cases/upload-clinic-logo.use-case'
import { UploadClinicFaviconUseCase } from '../use-cases/upload-clinic-favicon.use-case'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'
import type { ICurrentUser } from '../../auth/types/current-user.type'

const mockRegister = { execute: jest.fn() } as unknown as jest.Mocked<RegisterClinicUseCase>
const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateClinicUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllClinicsUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>
const mockFindBySlug = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicBySlugUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateClinicUseCase>
const mockUploadLogo = { execute: jest.fn() } as unknown as jest.Mocked<UploadClinicLogoUseCase>
const mockUploadFavicon = { execute: jest.fn() } as unknown as jest.Mocked<UploadClinicFaviconUseCase>

const makeClinicResponse = (overrides = {}) => ({
  id: 'clinic-uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  logoUrl: null,
  faviconUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'logo',
    originalname: 'logo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  }
}

describe('ClinicsController', () => {
  let controller: ClinicsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ClinicsController(
      mockCreate,
      mockFindAll,
      mockFindById,
      mockFindBySlug,
      mockRegister,
      mockUpdate,
      mockUploadLogo,
      mockUploadFavicon,
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

  it('findBySlug delegates to FindClinicBySlugUseCase', async () => {
    const response = makeClinicResponse()
    mockFindBySlug.execute.mockResolvedValue(response as any)

    const result = await controller.findBySlug('clinica-do-coracao')

    expect(mockFindBySlug.execute).toHaveBeenCalledWith('clinica-do-coracao')
    expect(result).toBe(response)
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

  it('findCurrentClinic delegates to FindClinicByIdUseCase with clinicId from token', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.ADMIN, clinicId: 'clinic-uuid-1' }
    const response = makeClinicResponse()
    mockFindById.execute.mockResolvedValue(response as any)

    const result = await controller.findCurrentClinic(currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('clinic-uuid-1')
    expect(result).toBe(response)
  })

  it('findCurrentClinic throws UnauthorizedException when clinicId is null', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.PLATFORM_ADMIN, clinicId: null }

    await expect(controller.findCurrentClinic(currentUser)).rejects.toThrow(UnauthorizedException)
    expect(mockFindById.execute).not.toHaveBeenCalled()
  })

  it('uploadMyLogo delegates to UploadClinicLogoUseCase with clinicId and file', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.ADMIN, clinicId: 'clinic-uuid-1' }
    const file = makeFile()
    const response = makeClinicResponse({ logoUrl: 'https://bucket.s3.amazonaws.com/clinics/clinic-uuid-1/logo.jpg' })
    mockUploadLogo.execute.mockResolvedValue(response as any)

    const result = await controller.uploadMyLogo(currentUser, file)

    expect(mockUploadLogo.execute).toHaveBeenCalledWith('clinic-uuid-1', file)
    expect(result).toBe(response)
  })

  it('uploadMyLogo throws UnauthorizedException when clinicId is null', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.PLATFORM_ADMIN, clinicId: null }

    await expect(controller.uploadMyLogo(currentUser, makeFile())).rejects.toThrow(UnauthorizedException)
    expect(mockUploadLogo.execute).not.toHaveBeenCalled()
  })

  it('uploadLogo delegates to UploadClinicLogoUseCase with param id and file', async () => {
    const file = makeFile()
    const response = makeClinicResponse({ logoUrl: 'https://bucket.s3.amazonaws.com/clinics/clinic-uuid-1/logo.jpg' })
    mockUploadLogo.execute.mockResolvedValue(response as any)

    const result = await controller.uploadLogo('clinic-uuid-1', file)

    expect(mockUploadLogo.execute).toHaveBeenCalledWith('clinic-uuid-1', file)
    expect(result).toBe(response)
  })

  it('uploadMyFavicon delegates to UploadClinicFaviconUseCase with clinicId and file', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.ADMIN, clinicId: 'clinic-uuid-1' }
    const file = makeFile({ fieldname: 'favicon', mimetype: 'image/x-icon' })
    const response = makeClinicResponse({ faviconUrl: 'https://bucket.s3.amazonaws.com/clinics/clinic-uuid-1/favicon.ico' })
    mockUploadFavicon.execute.mockResolvedValue(response as any)

    const result = await controller.uploadMyFavicon(currentUser, file)

    expect(mockUploadFavicon.execute).toHaveBeenCalledWith('clinic-uuid-1', file)
    expect(result).toBe(response)
  })

  it('uploadFavicon delegates to UploadClinicFaviconUseCase with param id and file', async () => {
    const file = makeFile({ fieldname: 'favicon', mimetype: 'image/x-icon' })
    const response = makeClinicResponse({ faviconUrl: 'https://bucket.s3.amazonaws.com/clinics/clinic-uuid-1/favicon.ico' })
    mockUploadFavicon.execute.mockResolvedValue(response as any)

    const result = await controller.uploadFavicon('clinic-uuid-1', file)

    expect(mockUploadFavicon.execute).toHaveBeenCalledWith('clinic-uuid-1', file)
    expect(result).toBe(response)
  })

  it('uploadMyLogo throws UnauthorizedException when file is undefined', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.ADMIN, clinicId: 'clinic-uuid-1' }

    await expect(controller.uploadMyLogo(currentUser, undefined as any)).rejects.toThrow(UnauthorizedException)
    expect(mockUploadLogo.execute).not.toHaveBeenCalled()
  })

  it('uploadMyFavicon throws UnauthorizedException when clinicId is null', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.PLATFORM_ADMIN, clinicId: null }

    await expect(controller.uploadMyFavicon(currentUser, makeFile())).rejects.toThrow(UnauthorizedException)
    expect(mockUploadFavicon.execute).not.toHaveBeenCalled()
  })

  it('uploadMyFavicon throws UnauthorizedException when file is undefined', async () => {
    const currentUser: ICurrentUser = { id: 'user-uuid', role: UserRole.ADMIN, clinicId: 'clinic-uuid-1' }

    await expect(controller.uploadMyFavicon(currentUser, undefined as any)).rejects.toThrow(UnauthorizedException)
    expect(mockUploadFavicon.execute).not.toHaveBeenCalled()
  })

  it('uploadLogo throws UnauthorizedException when file is undefined', () => {
    expect(() => controller.uploadLogo('clinic-uuid-1', undefined as any)).toThrow(UnauthorizedException)
    expect(mockUploadLogo.execute).not.toHaveBeenCalled()
  })

  it('uploadFavicon throws UnauthorizedException when file is undefined', () => {
    expect(() => controller.uploadFavicon('clinic-uuid-1', undefined as any)).toThrow(UnauthorizedException)
    expect(mockUploadFavicon.execute).not.toHaveBeenCalled()
  })
})
