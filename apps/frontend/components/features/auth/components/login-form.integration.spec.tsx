jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')
jest.mock('../services/auth.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { LoginForm } from './login-form'

const mockPush = jest.fn()
const mockSetUser = jest.fn()

describe('LoginForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: object) => unknown) =>
      selector({ user: null, setUser: mockSetUser }),
    )
  })

  it('renders loading state while request is in flight', async () => {
    ;(authService.login as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))

    expect(screen.getByTestId('login-submit')).toBeDisabled()
  })

  it('updates auth store and navigates to /dashboard on success', async () => {
    const user = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    ;(authService.login as jest.Mock).mockResolvedValue(user)

    renderWithProviders(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'alice@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(user)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows "Email ou senha inválidos" on 401 response', async () => {
    ;(authService.login as jest.Mock).mockRejectedValue({
      status: 401,
      title: 'Unauthorized',
      detail: 'Invalid credentials',
    })

    renderWithProviders(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'wrong@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'wrongpass1')
    await userEvent.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent('Email ou senha inválidos')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('maps 422 field errors to form inputs', async () => {
    ;(authService.login as jest.Mock).mockRejectedValue({
      status: 422,
      title: 'Unprocessable Entity',
      detail: 'Validation failed',
      errors: [{ field: 'email', message: 'Este email já está em uso' }],
    })

    renderWithProviders(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'taken@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(screen.getByText('Este email já está em uso')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })

  it('shows generic error message for unexpected errors', async () => {
    ;(authService.login as jest.Mock).mockRejectedValue({
      status: 500,
      title: 'Internal Error',
      detail: 'Something went wrong',
    })

    renderWithProviders(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent(
        'Não foi possível fazer login. Tente novamente.',
      )
    })
  })
})
