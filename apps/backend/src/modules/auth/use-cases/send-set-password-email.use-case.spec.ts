import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { SendSetPasswordEmailUseCase } from './send-set-password-email.use-case'
import { IPasswordSetTokensRepository } from '../repositories/password-set-tokens.repository.interface'
import { IEmailAdapter } from '../adapters/email.adapter.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { FindThemeByIdUseCase } from '../../themes/use-cases/find-theme-by-id.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'

jest.mock('../../../config/env.config', () => ({
  getEnvConfig: () => ({ FRONTEND_URL: 'http://localhost:3000' }),
}))

const mockPasswordSetTokensRepository: jest.Mocked<IPasswordSetTokensRepository> = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  markAsUsed: jest.fn(),
}

const mockUsersRepository: jest.Mocked<Pick<IUsersRepository, 'findById'>> = {
  findById: jest.fn(),
} as any

const mockFindClinicByIdUseCase = {
  execute: jest.fn(),
} as jest.Mocked<Pick<FindClinicByIdUseCase, 'execute'>>

const mockFindThemeByIdUseCase = {
  execute: jest.fn(),
} as jest.Mocked<Pick<FindThemeByIdUseCase, 'execute'>>

const mockEmailAdapter: jest.Mocked<IEmailAdapter> = {
  sendSetPasswordEmail: jest.fn(),
}

const makeUser = () => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
})

const makeClinic = (overrides: Partial<{ slug: string; name: string; logoUrl: string | null; themeId: string | null }> = {}) => ({
  id: faker.string.uuid(),
  slug: overrides.slug ?? 'minha-clinica',
  name: overrides.name ?? 'Minha Clínica',
  logoUrl: overrides.logoUrl ?? null,
  themeId: overrides.themeId ?? null,
})

const makeTheme = (overrides: Partial<{ accentColor: string; accentSoftColor: string }> = {}) => ({
  id: faker.string.uuid(),
  accentColor: overrides.accentColor ?? '#1a73e8',
  accentSoftColor: overrides.accentSoftColor ?? '#e8f0fe',
})

const makeToken = () => ({ id: faker.string.uuid() })

describe('SendSetPasswordEmailUseCase', () => {
  let useCase: SendSetPasswordEmailUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    mockPasswordSetTokensRepository.create.mockResolvedValue(makeToken() as any)
    useCase = new SendSetPasswordEmailUseCase(
      {} as DataSource,
      mockPasswordSetTokensRepository,
      mockUsersRepository as any,
      mockFindClinicByIdUseCase as any,
      mockEmailAdapter,
      mockFindThemeByIdUseCase as any,
    )
  })

  it('persists token and sends email with clinic slug in link', async () => {
    const user = makeUser()
    const clinic = makeClinic({ slug: 'clinica-a' })
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(clinic as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, clinic.id)

    expect(mockPasswordSetTokensRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, clinicId: clinic.id }),
    )
    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        recipientName: user.fullName,
        link: expect.stringContaining(`/clinica-a/set-password?token=`),
      }),
    )
  })

  it('passes clinicName and clinicLogoUrl when clinic has a logo', async () => {
    const user = makeUser()
    const clinic = makeClinic({ name: 'Clínica do Vale', logoUrl: 'https://s3.example.com/logo.png' })
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(clinic as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, clinic.id)

    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicName: 'Clínica do Vale',
        clinicLogoUrl: 'https://s3.example.com/logo.png',
      }),
    )
  })

  it('passes clinicLogoUrl as undefined when clinic has no logo', async () => {
    const user = makeUser()
    const clinic = makeClinic({ logoUrl: null })
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(clinic as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, clinic.id)

    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ clinicLogoUrl: undefined }),
    )
  })

  it('resolves accentColor from clinic theme when themeId is set', async () => {
    const user = makeUser()
    const themeId = faker.string.uuid()
    const clinic = makeClinic({ themeId })
    const theme = makeTheme({ accentColor: '#e65c00', accentSoftColor: '#fce4ec' })
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(clinic as any)
    mockFindThemeByIdUseCase.execute.mockResolvedValue(theme as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, clinic.id)

    expect(mockFindThemeByIdUseCase.execute).toHaveBeenCalledWith(themeId)
    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accentColor: '#e65c00', accentSoftColor: '#fce4ec' }),
    )
  })

  it('does not call FindThemeByIdUseCase when clinic has no themeId', async () => {
    const user = makeUser()
    const clinic = makeClinic({ themeId: null })
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(clinic as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, clinic.id)

    expect(mockFindThemeByIdUseCase.execute).not.toHaveBeenCalled()
    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accentColor: undefined }),
    )
  })

  it('sends email with undefined accentColor when theme lookup fails', async () => {
    const user = makeUser()
    const clinic = makeClinic({ themeId: faker.string.uuid() })
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(clinic as any)
    mockFindThemeByIdUseCase.execute.mockRejectedValue(new Error('Theme not found'))
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, clinic.id)

    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accentColor: undefined }),
    )
  })

  it('uses /set-password (no slug) when clinicId is null', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, null)

    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ link: expect.stringContaining('/set-password?token=') }),
    )
    expect(mockFindClinicByIdUseCase.execute).not.toHaveBeenCalled()
    expect(mockFindThemeByIdUseCase.execute).not.toHaveBeenCalled()
  })

  it('passes undefined branding when clinicId is null', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, null)

    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ clinicName: undefined, clinicLogoUrl: undefined, accentColor: undefined }),
    )
  })

  it('stores sha256 hash of token — not the plaintext', async () => {
    mockUsersRepository.findById.mockResolvedValue(makeUser() as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(makeClinic() as any)
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(faker.string.uuid(), faker.string.uuid())

    const { tokenHash } = mockPasswordSetTokensRepository.create.mock.calls[0][0]
    expect(tokenHash).toHaveLength(64)
    expect(tokenHash).toMatch(/^[a-f0-9]+$/)
  })

  it('does not throw when email adapter fails with Error', async () => {
    mockUsersRepository.findById.mockResolvedValue(makeUser() as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(makeClinic() as any)
    mockEmailAdapter.sendSetPasswordEmail.mockRejectedValue(new Error('SMTP error'))

    await expect(useCase.execute(faker.string.uuid(), faker.string.uuid())).resolves.toBeUndefined()
  })

  it('does not throw when email adapter rejects with a non-Error value', async () => {
    mockUsersRepository.findById.mockResolvedValue(makeUser() as any)
    mockFindClinicByIdUseCase.execute.mockResolvedValue(makeClinic() as any)
    mockEmailAdapter.sendSetPasswordEmail.mockRejectedValue('smtp-connection-refused')

    await expect(useCase.execute(faker.string.uuid(), faker.string.uuid())).resolves.toBeUndefined()
  })

  it('falls back to /set-password path when clinic lookup throws', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockFindClinicByIdUseCase.execute.mockRejectedValue(new Error('Clinic not found'))
    mockEmailAdapter.sendSetPasswordEmail.mockResolvedValue(undefined)

    await useCase.execute(user.id, 'any-clinic-id')

    expect(mockEmailAdapter.sendSetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ link: expect.stringContaining('/set-password?token=') }),
    )
  })

  it('does not throw when user is not found', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), faker.string.uuid())).resolves.toBeUndefined()
    expect(mockEmailAdapter.sendSetPasswordEmail).not.toHaveBeenCalled()
  })
})
