import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { HeaderUserMenu, getInitials } from './header-user-menu'
import type { IHeaderUserModel } from '../types/header.types'

const baseUser: IHeaderUserModel = {
  id: 'user-1',
  fullName: 'Maria Oliveira',
  email: 'maria@example.com',
}

function renderMenu(
  props: Partial<React.ComponentProps<typeof HeaderUserMenu>> = {},
) {
  const defaultProps = {
    user: baseUser,
    onLogout: jest.fn().mockResolvedValue(undefined),
    isLoggingOut: false,
    logoutError: null,
  }
  return renderWithProviders(<HeaderUserMenu {...defaultProps} {...props} />)
}

describe('HeaderUserMenu', () => {
  describe('avatar button', () => {
    it('renders avatar button', () => {
      renderMenu()
      expect(screen.getByTestId('header-avatar-button')).toBeInTheDocument()
    })

    it('shows initials when no avatarUrl is provided', () => {
      renderMenu({ user: { ...baseUser, avatarUrl: undefined } })
      expect(screen.getByTestId('header-avatar-initials')).toBeInTheDocument()
      expect(screen.getByTestId('header-avatar-initials')).toHaveTextContent('MO')
    })

    it('shows img element when avatarUrl is provided', () => {
      renderMenu({ user: { ...baseUser, avatarUrl: 'https://example.com/avatar.jpg' } })
      const img = screen.getByTestId('header-avatar-image')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })

    it('has aria-label "Menu do usuário"', () => {
      renderMenu()
      expect(screen.getByLabelText('Menu do usuário')).toBeInTheDocument()
    })

    it('has aria-haspopup="true"', () => {
      renderMenu()
      const button = screen.getByTestId('header-avatar-button')
      expect(button).toHaveAttribute('aria-haspopup', 'true')
    })

    it('has aria-expanded="false" initially', () => {
      renderMenu()
      const button = screen.getByTestId('header-avatar-button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('sets aria-expanded="true" when dropdown is open', () => {
      renderMenu()
      const button = screen.getByTestId('header-avatar-button')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('dropdown visibility', () => {
    it('does not show dropdown initially', () => {
      renderMenu()
      expect(screen.queryByTestId('header-user-dropdown')).not.toBeInTheDocument()
    })

    it('opens dropdown when avatar button is clicked', () => {
      renderMenu()
      const button = screen.getByTestId('header-avatar-button')
      fireEvent.click(button)
      expect(screen.getByTestId('header-user-dropdown')).toBeInTheDocument()
    })

    it('closes dropdown when avatar button is clicked again', () => {
      renderMenu()
      const button = screen.getByTestId('header-avatar-button')
      fireEvent.click(button)
      fireEvent.click(button)
      expect(screen.queryByTestId('header-user-dropdown')).not.toBeInTheDocument()
    })

    it('closes dropdown when backdrop is clicked', () => {
      renderMenu()
      const button = screen.getByTestId('header-avatar-button')
      fireEvent.click(button)
      expect(screen.getByTestId('header-user-dropdown')).toBeInTheDocument()

      const backdrop = screen.getByTestId('header-user-menu-backdrop')
      fireEvent.click(backdrop)
      expect(screen.queryByTestId('header-user-dropdown')).not.toBeInTheDocument()
    })
  })

  describe('dropdown content', () => {
    it('shows user fullName in dropdown', () => {
      renderMenu()
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.getByText('Maria Oliveira')).toBeInTheDocument()
    })

    it('shows user email in dropdown', () => {
      renderMenu()
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.getByText('maria@example.com')).toBeInTheDocument()
    })

    it('renders logout button in dropdown', () => {
      renderMenu()
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.getByTestId('header-logout-button')).toBeInTheDocument()
    })

    it('shows "Sair" text when not logging out', () => {
      renderMenu({ isLoggingOut: false })
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.getByText('Sair')).toBeInTheDocument()
    })

    it('shows "Saindo..." when isLoggingOut is true', () => {
      renderMenu({ isLoggingOut: true })
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.getByText('Saindo...')).toBeInTheDocument()
    })

    it('disables logout button when isLoggingOut is true', () => {
      renderMenu({ isLoggingOut: true })
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      const logoutButton = screen.getByTestId('header-logout-button')
      expect(logoutButton).toBeDisabled()
    })

    it('logout button is enabled when not logging out', () => {
      renderMenu({ isLoggingOut: false })
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      const logoutButton = screen.getByTestId('header-logout-button')
      expect(logoutButton).not.toBeDisabled()
    })

    it('does not show error message when logoutError is null', () => {
      renderMenu({ logoutError: null })
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.queryByTestId('header-logout-error')).not.toBeInTheDocument()
    })

    it('shows error message when logoutError is set', () => {
      renderMenu({ logoutError: 'Ocorreu um erro ao sair. Tente novamente.' })
      fireEvent.click(screen.getByTestId('header-avatar-button'))
      expect(screen.getByTestId('header-logout-error')).toBeInTheDocument()
      expect(screen.getByTestId('header-logout-error')).toHaveTextContent(
        'Ocorreu um erro ao sair. Tente novamente.',
      )
    })
  })

  describe('logout action', () => {
    it('calls onLogout when logout button is clicked', async () => {
      const onLogout = jest.fn().mockResolvedValue(undefined)
      renderMenu({ onLogout })

      fireEvent.click(screen.getByTestId('header-avatar-button'))
      fireEvent.click(screen.getByTestId('header-logout-button'))

      await waitFor(() => {
        expect(onLogout).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('getInitials helper', () => {
    it('returns first letter uppercase for single word', () => {
      expect(getInitials('Ana')).toBe('A')
    })

    it('returns first and last initials for two words', () => {
      expect(getInitials('Maria Oliveira')).toBe('MO')
    })

    it('returns first and last initials for more than two words', () => {
      expect(getInitials('João Carlos Silva')).toBe('JS')
    })

    it('handles extra whitespace', () => {
      expect(getInitials('  Ana   Costa  ')).toBe('AC')
    })

    it('returns uppercase initials', () => {
      expect(getInitials('ana costa')).toBe('AC')
    })
  })
})
