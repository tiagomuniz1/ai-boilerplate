jest.mock('../hooks/use-login.hook')
jest.mock('next/navigation', () => ({ useSearchParams: jest.fn() }))
jest.mock('./turnstile-widget', () => ({
  TurnstileWidget: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button type="button" data-testid="login-captcha" onClick={() => onVerify('mock-captcha-token')}>
      Resolver captcha
    </button>
  ),
}))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSearchParams } from 'next/navigation'
import { useLogin } from '../hooks/use-login.hook'
import { LoginForm } from './login-form'

const mockUseLogin = useLogin as jest.Mock

describe('LoginForm', () => {
  const mockMutate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSearchParams as jest.Mock).mockReturnValue({ get: jest.fn().mockReturnValue(null) })
    mockUseLogin.mockReturnValue({ mutate: mockMutate, isPending: false })
  })

  it('renders email input, password input and submit button', () => {
    render(<LoginForm />)
    expect(screen.getByTestId('login-email')).toBeInTheDocument()
    expect(screen.getByTestId('login-password')).toBeInTheDocument()
    expect(screen.getByTestId('login-submit')).toBeInTheDocument()
  })

  it('does not show global error on initial render', () => {
    render(<LoginForm />)
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })

  it('shows email validation error for invalid format', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'not-an-email')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows password validation error for short password', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'short')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('disables submit button and shows spinner while pending', () => {
    mockUseLogin.mockReturnValue({ mutate: mockMutate, isPending: true })
    render(<LoginForm />)
    expect(screen.getByTestId('login-submit')).toBeDisabled()
    expect(screen.getByRole('button', { name: /entrar/i })).toHaveAttribute('aria-busy', 'true')
  })

  it('calls mutate with form values on valid submit', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { email: 'user@example.com', password: 'password123' },
        expect.objectContaining({ onError: expect.any(Function) }),
      )
    })
  })

  it('shows "Email ou senha inválidos" when onError receives 401', async () => {
    mockUseLogin.mockReturnValue({
      mutate: (_data: unknown, callbacks: { onError: (e: object) => void }) => {
        callbacks.onError({ status: 401, title: 'Unauthorized', detail: 'Invalid credentials' })
      },
      isPending: false,
    })
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent('Email ou senha inválidos')
    })
  })

  it('shows generic error message for non-401 errors', async () => {
    mockUseLogin.mockReturnValue({
      mutate: (_data: unknown, callbacks: { onError: (e: object) => void }) => {
        callbacks.onError({ status: 500, title: 'Internal Error', detail: 'Something went wrong' })
      },
      isPending: false,
    })
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent(
        'Não foi possível fazer login. Tente novamente.',
      )
    })
  })

  it('maps 422 field errors to form inputs via setError', async () => {
    mockUseLogin.mockReturnValue({
      mutate: (_data: unknown, callbacks: { onError: (e: object) => void }) => {
        callbacks.onError({
          status: 422,
          title: 'Unprocessable Entity',
          detail: 'Validation failed',
          errors: [{ field: 'email', message: 'Este email já está em uso' }],
        })
      },
      isPending: false,
    })
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'taken@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.getByText('Este email já está em uso')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })

  it('clears global error when form is resubmitted', async () => {
    let callCount = 0
    mockUseLogin.mockReturnValue({
      mutate: (_data: unknown, callbacks: { onError: (e: object) => void }) => {
        callCount++
        if (callCount === 1) {
          callbacks.onError({ status: 401, title: 'Unauthorized', detail: 'Invalid' })
        }
      },
      isPending: false,
    })
    render(<LoginForm />)
    await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
    await userEvent.type(screen.getByTestId('login-password'), 'password123')
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('login-submit'))
    await waitFor(() => {
      expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
    })
  })

  describe('captcha (3rd failed attempt onward)', () => {
    it('does not render the captcha widget initially', () => {
      render(<LoginForm />)
      expect(screen.queryByTestId('login-captcha')).not.toBeInTheDocument()
    })

    it('renders the captcha widget when the backend signals requiresCaptcha', async () => {
      mockUseLogin.mockReturnValue({
        mutate: (_data: unknown, callbacks: { onError: (e: object) => void }) => {
          callbacks.onError({ status: 401, detail: 'Invalid credentials', requiresCaptcha: true })
        },
        isPending: false,
      })
      render(<LoginForm />)
      await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
      await userEvent.type(screen.getByTestId('login-password'), 'password123')
      await userEvent.click(screen.getByTestId('login-submit'))
      await waitFor(() => {
        expect(screen.getByTestId('login-captcha')).toBeInTheDocument()
      })
    })

    it('disables submit until the captcha is solved once required', async () => {
      mockUseLogin.mockReturnValue({
        mutate: (_data: unknown, callbacks: { onError: (e: object) => void }) => {
          callbacks.onError({ status: 401, detail: 'Invalid credentials', requiresCaptcha: true })
        },
        isPending: false,
      })
      render(<LoginForm />)
      await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
      await userEvent.type(screen.getByTestId('login-password'), 'password123')
      await userEvent.click(screen.getByTestId('login-submit'))
      await waitFor(() => {
        expect(screen.getByTestId('login-submit')).toBeDisabled()
      })

      await userEvent.click(screen.getByTestId('login-captcha'))
      await waitFor(() => {
        expect(screen.getByTestId('login-submit')).not.toBeDisabled()
      })
    })

    it('includes the solved captchaToken in the next submit payload', async () => {
      const trackedMutate = jest.fn(
        (_data: unknown, callbacks: { onError: (e: object) => void }) => {
          callbacks.onError({ status: 401, detail: 'Invalid credentials', requiresCaptcha: true })
        },
      )
      mockUseLogin.mockReturnValue({ mutate: trackedMutate, isPending: false })
      render(<LoginForm />)
      await userEvent.type(screen.getByTestId('login-email'), 'user@example.com')
      await userEvent.type(screen.getByTestId('login-password'), 'password123')
      await userEvent.click(screen.getByTestId('login-submit'))

      await waitFor(() => expect(screen.getByTestId('login-captcha')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('login-captcha'))
      await userEvent.click(screen.getByTestId('login-submit'))

      await waitFor(() => {
        expect(trackedMutate).toHaveBeenLastCalledWith(
          { email: 'user@example.com', password: 'password123', captchaToken: 'mock-captcha-token' },
          expect.objectContaining({ onError: expect.any(Function) }),
        )
      })
    })
  })
})
