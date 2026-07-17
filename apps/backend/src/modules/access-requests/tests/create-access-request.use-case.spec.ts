import { DataSource } from 'typeorm'
import { CreateAccessRequestUseCase } from '../use-cases/create-access-request.use-case'
import { IAccessRequestEmailAdapter } from '../adapters/access-request-email.adapter.interface'

const mockAccessRequestEmailAdapter: jest.Mocked<IAccessRequestEmailAdapter> = {
  sendAccessRequestEmail: jest.fn(),
}

describe('CreateAccessRequestUseCase', () => {
  let useCase: CreateAccessRequestUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateAccessRequestUseCase({} as DataSource, mockAccessRequestEmailAdapter)
  })

  it('sends the access request email with the provided data', async () => {
    const dto = {
      fullName: 'Ana Costa',
      email: 'ana@clinica.com',
      clinicName: 'Clínica do Vale',
      phone: '11999998888',
    }

    await useCase.execute(dto)

    expect(mockAccessRequestEmailAdapter.sendAccessRequestEmail).toHaveBeenCalledWith(dto)
  })

  it('propagates errors from the email adapter', async () => {
    mockAccessRequestEmailAdapter.sendAccessRequestEmail.mockRejectedValue(new Error('SMTP down'))

    await expect(
      useCase.execute({ fullName: 'Ana', email: 'ana@clinica.com', clinicName: 'Clínica' }),
    ).rejects.toThrow('SMTP down')
  })
})
