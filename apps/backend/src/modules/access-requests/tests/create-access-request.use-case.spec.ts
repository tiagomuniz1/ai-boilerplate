import { DataSource } from 'typeorm'
import { CreateAccessRequestUseCase } from '../use-cases/create-access-request.use-case'
import { IAccessRequestEmailAdapter } from '../adapters/access-request-email.adapter.interface'
import { IAccessRequestsRepository } from '../repositories/access-requests.repository.interface'
import { AccessRequest } from '../entities/access-request.entity'

const mockAccessRequestEmailAdapter: jest.Mocked<IAccessRequestEmailAdapter> = {
  sendAccessRequestEmail: jest.fn(),
}

const mockAccessRequestsRepository: jest.Mocked<IAccessRequestsRepository> = {
  create: jest.fn(),
}

describe('CreateAccessRequestUseCase', () => {
  let useCase: CreateAccessRequestUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateAccessRequestUseCase(
      {} as DataSource,
      mockAccessRequestsRepository,
      mockAccessRequestEmailAdapter,
    )
  })

  it('persists the access request with the provided data', async () => {
    const dto = {
      fullName: 'Ana Costa',
      email: 'ana@clinica.com',
      clinicName: 'Clínica do Vale',
      phone: '11999998888',
    }
    mockAccessRequestsRepository.create.mockResolvedValue({ id: 'uuid-1', ...dto } as AccessRequest)

    await useCase.execute(dto)

    expect(mockAccessRequestsRepository.create).toHaveBeenCalledWith(dto)
  })

  it('sends the access request email with the provided data', async () => {
    const dto = {
      fullName: 'Ana Costa',
      email: 'ana@clinica.com',
      clinicName: 'Clínica do Vale',
      phone: '11999998888',
    }
    mockAccessRequestsRepository.create.mockResolvedValue({ id: 'uuid-1', ...dto } as AccessRequest)

    await useCase.execute(dto)

    expect(mockAccessRequestEmailAdapter.sendAccessRequestEmail).toHaveBeenCalledWith(dto)
  })

  it('persists before sending the email', async () => {
    const callOrder: string[] = []
    mockAccessRequestsRepository.create.mockImplementation(async () => {
      callOrder.push('create')
      return {} as AccessRequest
    })
    mockAccessRequestEmailAdapter.sendAccessRequestEmail.mockImplementation(async () => {
      callOrder.push('email')
    })

    await useCase.execute({ fullName: 'Ana', email: 'ana@clinica.com', clinicName: 'Clínica' })

    expect(callOrder).toEqual(['create', 'email'])
  })

  it('propagates errors from the repository', async () => {
    mockAccessRequestsRepository.create.mockRejectedValue(new Error('DB down'))

    await expect(
      useCase.execute({ fullName: 'Ana', email: 'ana@clinica.com', clinicName: 'Clínica' }),
    ).rejects.toThrow('DB down')

    expect(mockAccessRequestEmailAdapter.sendAccessRequestEmail).not.toHaveBeenCalled()
  })

  it('propagates errors from the email adapter', async () => {
    mockAccessRequestsRepository.create.mockResolvedValue({} as AccessRequest)
    mockAccessRequestEmailAdapter.sendAccessRequestEmail.mockRejectedValue(new Error('SMTP down'))

    await expect(
      useCase.execute({ fullName: 'Ana', email: 'ana@clinica.com', clinicName: 'Clínica' }),
    ).rejects.toThrow('SMTP down')
  })
})
