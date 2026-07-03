jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic' }))
jest.mock('../services/set-password.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { setPasswordService } from '../services/set-password.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SetPasswordForm } from './set-password-form'

const mockPush = jest.fn()
const mockGet = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  ;(useSearchParams as jest.Mock).mockReturnValue({ get: mockGet })
})

describe('SetPasswordForm (integration)', () => {
  describe('missing token', () => {
    it('shows missing-token alert when URL has no token', () => {
      mockGet.mockReturnValue(null)

      renderWithProviders(<SetPasswordForm />)

      expect(screen.getByTestId('set-password-missing-token')).toBeInTheDocument()
      expect(screen.queryByTestId('set-password-validating')).not.toBeInTheDocument()
    })
  })

  describe('with token', () => {
    beforeEach(() => {
      mockGet.mockReturnValue('validtoken123')
    })

    it('shows spinner while validating the token', () => {
      ;(setPasswordService.validate as jest.Mock).mockReturnValue(new Promise(() => {}))

      renderWithProviders(<SetPasswordForm />)

      expect(screen.getByTestId('set-password-validating')).toBeInTheDocument()
      expect(screen.queryByTestId('set-password-missing-token')).not.toBeInTheDocument()
    })

    it('shows invalid-token alert when valid is false', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({ valid: false, email: null })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByTestId('set-password-invalid-token')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('set-password-email')).not.toBeInTheDocument()
    })

    it('shows form with readonly email when valid is true', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByTestId('set-password-email')).toBeInTheDocument()
      })
      expect(screen.getByTestId('set-password-email')).toHaveValue('doc@example.com')
      expect(screen.getByTestId('set-password-password')).toBeInTheDocument()
      expect(screen.getByTestId('set-password-confirm-password')).toBeInTheDocument()
    })

    it('shows zod error when passwords do not match', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'password123')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'different123')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
      })
      expect(setPasswordService.setPassword).not.toHaveBeenCalled()
    })

    it('calls setPassword with token and password on valid submit', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockResolvedValue(undefined)

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'newpassword1')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'newpassword1')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(setPasswordService.setPassword).toHaveBeenCalledWith({
          token: 'validtoken123',
          password: 'newpassword1',
        })
      })
    })

    it('redirects to login with passwordSet=true on success', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockResolvedValue(undefined)

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'newpassword1')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'newpassword1')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/test-clinic/login?passwordSet=true')
      })
    })

    it('shows "já foi utilizado" message on 422 already-used error', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockRejectedValue({
        status: 422,
        detail: 'Token already used',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'password123')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'password123')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('set-password-error')).toHaveTextContent(
          'Este link já foi utilizado.',
        )
      })
    })

    it('shows "expirou" message on 422 expired error', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockRejectedValue({
        status: 422,
        detail: 'Token expired',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'password123')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'password123')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('set-password-error')).toHaveTextContent('Este link expirou.')
      })
    })

    it('shows generic error for 422 with an unrecognized detail message', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockRejectedValue({
        status: 422,
        detail: 'Something else went wrong',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'password123')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'password123')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('set-password-error')).toHaveTextContent(
          'Não foi possível definir sua senha. Tente novamente.',
        )
      })
    })

    it('shows generic error for 422 with no detail message', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockRejectedValue({
        status: 422,
        detail: undefined,
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'password123')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'password123')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('set-password-error')).toHaveTextContent(
          'Não foi possível definir sua senha. Tente novamente.',
        )
      })
    })

    it('shows readonly email empty when validation has no email', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: null,
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByTestId('set-password-email')).toBeInTheDocument()
      })
      expect(screen.getByTestId('set-password-email')).toHaveValue('')
    })

    it('shows zod error when password is too short', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'short')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'short')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument()
      })
    })

    it('shows generic error for unexpected errors', async () => {
      ;(setPasswordService.validate as jest.Mock).mockResolvedValue({
        valid: true,
        email: 'doc@example.com',
      })
      ;(setPasswordService.setPassword as jest.Mock).mockRejectedValue({
        status: 500,
        detail: 'Internal Server Error',
      })

      renderWithProviders(<SetPasswordForm />)

      await waitFor(() => screen.getByTestId('set-password-password'))

      await userEvent.type(screen.getByTestId('set-password-password'), 'password123')
      await userEvent.type(screen.getByTestId('set-password-confirm-password'), 'password123')
      await userEvent.click(screen.getByTestId('set-password-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('set-password-error')).toHaveTextContent(
          'Não foi possível definir sua senha. Tente novamente.',
        )
      })
    })
  })
})
