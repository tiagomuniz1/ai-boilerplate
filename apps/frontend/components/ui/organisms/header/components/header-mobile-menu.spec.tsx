import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { HeaderMobileMenu } from './header-mobile-menu'

describe('HeaderMobileMenu', () => {
  it('renders the mobile menu button', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={false} onToggle={jest.fn()} />)
    expect(screen.getByTestId('header-mobile-menu')).toBeInTheDocument()
  })

  it('has aria-label "Abrir menu" when isOpen is false', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={false} onToggle={jest.fn()} />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button).toHaveAttribute('aria-label', 'Abrir menu')
  })

  it('has aria-label "Fechar menu" when isOpen is true', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={true} onToggle={jest.fn()} />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button).toHaveAttribute('aria-label', 'Fechar menu')
  })

  it('has aria-expanded="false" when isOpen is false', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={false} onToggle={jest.fn()} />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('has aria-expanded="true" when isOpen is true', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={true} onToggle={jest.fn()} />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onToggle when button is clicked', () => {
    const onToggle = jest.fn()
    renderWithProviders(<HeaderMobileMenu isOpen={false} onToggle={onToggle} />)
    const button = screen.getByTestId('header-mobile-menu')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('has md:hidden class to be hidden on medium and larger screens', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={false} onToggle={jest.fn()} />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button.className).toContain('md:hidden')
  })

  it('is a button element of type button', () => {
    renderWithProviders(<HeaderMobileMenu isOpen={false} onToggle={jest.fn()} />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })
})
