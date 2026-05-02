jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { HeaderLogo } from './header-logo'

describe('HeaderLogo', () => {
  it('renders the logo link', () => {
    renderWithProviders(<HeaderLogo />)

    expect(screen.getByTestId('header-logo')).toBeInTheDocument()
  })

  it('has the correct href pointing to root', () => {
    renderWithProviders(<HeaderLogo />)

    const link = screen.getByTestId('header-logo')
    expect(link).toHaveAttribute('href', '/')
  })

  it('has correct aria-label', () => {
    renderWithProviders(<HeaderLogo />)

    const link = screen.getByLabelText('Ir para o início')
    expect(link).toBeInTheDocument()
  })

  it('calls onClick when logo is clicked', () => {
    const handleClick = jest.fn()
    renderWithProviders(<HeaderLogo onClick={handleClick} />)

    const link = screen.getByTestId('header-logo')
    fireEvent.click(link)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders without onClick without throwing', () => {
    expect(() => renderWithProviders(<HeaderLogo />)).not.toThrow()
  })

  it('displays the U letter inside the logo', () => {
    renderWithProviders(<HeaderLogo />)

    expect(screen.getByText('U')).toBeInTheDocument()
  })
})
