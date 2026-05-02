jest.mock('@/stores/auth.store')
jest.mock('../services/auth.service')

import { render, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { AuthInitializer } from './auth-initializer'
import type { IAuthUserModel } from '../types/auth.types'

const mockSetUser = jest.fn()

const mockUser: IAuthUserModel = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
}

function mockAuthStore(user: IAuthUserModel | null) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: IAuthUserModel | null; setUser: jest.Mock }) => unknown) =>
      selector({ user, setUser: mockSetUser }),
  )
}

describe('AuthInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing to the DOM', () => {
    mockAuthStore(mockUser)
    const { container } = render(<AuthInitializer />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not call authService.getMe when user is already set', () => {
    mockAuthStore(mockUser)
    render(<AuthInitializer />)
    expect(authService.getMe).not.toHaveBeenCalled()
  })

  it('calls authService.getMe when user is null', async () => {
    mockAuthStore(null)
    ;(authService.getMe as jest.Mock).mockResolvedValue({
      id: 'uuid-2',
      fullName: 'Bob Silva',
      email: 'bob@example.com',
    })

    render(<AuthInitializer />)

    await waitFor(() => {
      expect(authService.getMe).toHaveBeenCalledTimes(1)
    })
  })

  it('calls setUser with the mapped model when getMe resolves', async () => {
    mockAuthStore(null)
    ;(authService.getMe as jest.Mock).mockResolvedValue({
      id: 'uuid-2',
      fullName: 'Bob Silva',
      email: 'bob@example.com',
    })

    render(<AuthInitializer />)

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'uuid-2',
        fullName: 'Bob Silva',
        email: 'bob@example.com',
      })
    })
  })

  it('does not throw and does not call setUser when getMe rejects', async () => {
    mockAuthStore(null)
    ;(authService.getMe as jest.Mock).mockRejectedValue(new Error('401 Unauthorized'))

    expect(() => render(<AuthInitializer />)).not.toThrow()

    await waitFor(() => {
      expect(authService.getMe).toHaveBeenCalledTimes(1)
    })

    expect(mockSetUser).not.toHaveBeenCalled()
  })
})
