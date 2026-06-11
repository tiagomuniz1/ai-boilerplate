jest.mock('@/stores/auth.store')
jest.mock('../services/auth.service')

import { render, waitFor } from '@testing-library/react'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { AuthInitializer } from './auth-initializer'
import type { IAuthUserModel } from '../types/auth.types'

const mockSetUser = jest.fn()

const mockUser: IAuthUserModel = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.DOCTOR,
  clinicId: 'clinic-uuid-1',
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

  it('does not call authService.getMe when user already has a role and clinicId is set', () => {
    mockAuthStore(mockUser)
    render(<AuthInitializer />)
    expect(authService.getMe).not.toHaveBeenCalled()
  })

  it('does not call authService.getMe when user has role and clinicId is null (PLATFORM_ADMIN)', () => {
    mockAuthStore({ ...mockUser, clinicId: null })
    render(<AuthInitializer />)
    expect(authService.getMe).not.toHaveBeenCalled()
  })

  it('calls authService.getMe when user has role but clinicId is undefined (stale persisted data)', async () => {
    const staleUser = { ...mockUser, clinicId: undefined } as unknown as IAuthUserModel
    mockAuthStore(staleUser)
    ;(authService.getMe as jest.Mock).mockResolvedValue({ ...mockUser })

    render(<AuthInitializer />)

    await waitFor(() => {
      expect(authService.getMe).toHaveBeenCalledTimes(1)
    })
  })

  it('calls authService.getMe when user exists but has no role (stale state)', async () => {
    const staleUser = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' } as unknown as IAuthUserModel
    mockAuthStore(staleUser)
    ;(authService.getMe as jest.Mock).mockResolvedValue({
      id: 'uuid-1',
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      role: UserRole.ADMIN,
      clinicId: 'clinic-uuid-1',
    })

    render(<AuthInitializer />)

    await waitFor(() => {
      expect(authService.getMe).toHaveBeenCalledTimes(1)
    })
  })

  it('calls authService.getMe when user is null', async () => {
    mockAuthStore(null)
    ;(authService.getMe as jest.Mock).mockResolvedValue({
      id: 'uuid-2',
      fullName: 'Bob Silva',
      email: 'bob@example.com',
      role: UserRole.ADMIN,
      clinicId: 'clinic-uuid-2',
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
      role: UserRole.ADMIN,
      clinicId: 'clinic-uuid-2',
    })

    render(<AuthInitializer />)

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'uuid-2',
        fullName: 'Bob Silva',
        email: 'bob@example.com',
        role: UserRole.ADMIN,
        clinicId: 'clinic-uuid-2',
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
