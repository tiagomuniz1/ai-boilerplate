jest.mock('next/navigation', () => ({ useRouter: jest.fn(), useSearchParams: jest.fn() }))
jest.mock('@/stores/auth.store')
jest.mock('../services/auth.service')
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { LoginForm } from './login-form'

const mockPush = jest.fn()
const mockSetUser = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)

describe('LoginForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useSearchParams as jest.Mock).mockReturnValue({ get: mockGet })
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
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/dashboard')
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

  it('shows success alert when ?passwordSet=true is in URL', () => {
    mockGet.mockReturnValue('true')

    renderWithProviders(<LoginForm />)

    expect(screen.getByTestId('login-password-set-success')).toHaveTextContent(
      'Senha definida com sucesso. Faça login para continuar.',
    )
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })

  it('does not show success alert when ?passwordSet is absent', () => {
    mockGet.mockReturnValue(null)

    renderWithProviders(<LoginForm />)

    expect(screen.queryByTestId('login-password-set-success')).not.toBeInTheDocument()
  })
})
