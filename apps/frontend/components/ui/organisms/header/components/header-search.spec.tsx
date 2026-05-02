import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { HeaderSearch } from './header-search'

describe('HeaderSearch', () => {
  it('renders the search container', () => {
    renderWithProviders(<HeaderSearch />)

    expect(screen.getByTestId('header-search')).toBeInTheDocument()
  })

  it('renders the search input', () => {
    renderWithProviders(<HeaderSearch />)

    expect(screen.getByTestId('header-search-input')).toBeInTheDocument()
  })

  it('has correct placeholder text', () => {
    renderWithProviders(<HeaderSearch />)

    const input = screen.getByTestId('header-search-input')
    expect(input).toHaveAttribute('placeholder', 'Buscar...')
  })

  it('has correct aria-label on the input', () => {
    renderWithProviders(<HeaderSearch />)

    const input = screen.getByLabelText('Buscar')
    expect(input).toBeInTheDocument()
  })

  it('renders the keyboard shortcut kbd element', () => {
    renderWithProviders(<HeaderSearch />)

    const kbd = screen.getByText('⌘K')
    expect(kbd.tagName).toBe('KBD')
  })

  it('input is of type search', () => {
    renderWithProviders(<HeaderSearch />)

    const input = screen.getByTestId('header-search-input')
    expect(input).toHaveAttribute('type', 'search')
  })
})
