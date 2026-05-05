import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './theme-toggle'
import { useThemeStore } from '@/stores/theme.store'

jest.mock('@/stores/theme.store', () => ({
  useThemeStore: jest.fn(),
}))

const mockToggleTheme = jest.fn()
const mockUseThemeStore = useThemeStore as jest.MockedFunction<typeof useThemeStore>

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('light theme', () => {
    beforeEach(() => {
      mockUseThemeStore.mockImplementation((selector?: (s: any) => any) => {
        const state = { theme: 'light', toggleTheme: mockToggleTheme, setTheme: jest.fn() }
        return selector ? selector(state) : state
      })
    })

    it('renders Moon icon when theme is light', () => {
      render(<ThemeToggle />)
      expect(screen.getByTestId('theme-toggle-icon-moon')).toBeInTheDocument()
      expect(screen.queryByTestId('theme-toggle-icon-sun')).not.toBeInTheDocument()
    })

    it('has aria-label "Alternar para modo escuro" when theme is light', () => {
      render(<ThemeToggle />)
      expect(screen.getByLabelText('Alternar para modo escuro')).toBeInTheDocument()
    })

    it('calls toggleTheme when clicked in light mode', () => {
      render(<ThemeToggle />)
      fireEvent.click(screen.getByTestId('theme-toggle'))
      expect(mockToggleTheme).toHaveBeenCalledTimes(1)
    })
  })

  describe('dark theme', () => {
    beforeEach(() => {
      mockUseThemeStore.mockImplementation((selector?: (s: any) => any) => {
        const state = { theme: 'dark', toggleTheme: mockToggleTheme, setTheme: jest.fn() }
        return selector ? selector(state) : state
      })
    })

    it('renders Sun icon when theme is dark', () => {
      render(<ThemeToggle />)
      expect(screen.getByTestId('theme-toggle-icon-sun')).toBeInTheDocument()
      expect(screen.queryByTestId('theme-toggle-icon-moon')).not.toBeInTheDocument()
    })

    it('has aria-label "Alternar para modo claro" when theme is dark', () => {
      render(<ThemeToggle />)
      expect(screen.getByLabelText('Alternar para modo claro')).toBeInTheDocument()
    })

    it('calls toggleTheme when clicked in dark mode', () => {
      render(<ThemeToggle />)
      fireEvent.click(screen.getByTestId('theme-toggle'))
      expect(mockToggleTheme).toHaveBeenCalledTimes(1)
    })
  })

  it('has data-testid="theme-toggle"', () => {
    mockUseThemeStore.mockImplementation((selector?: (s: any) => any) => {
      const state = { theme: 'light', toggleTheme: mockToggleTheme, setTheme: jest.fn() }
      return selector ? selector(state) : state
    })
    render(<ThemeToggle />)
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })
})
