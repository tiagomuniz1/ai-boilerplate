jest.mock('@/hooks/use-apply-clinic-theme.hook', () => ({
  useApplyClinicTheme: jest.fn(),
}))

import { render } from '@testing-library/react'
import { useApplyClinicTheme } from '@/hooks/use-apply-clinic-theme.hook'
import { ClinicThemeProvider } from './clinic-theme-provider'

describe('ClinicThemeProvider', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls useApplyClinicTheme on render', () => {
    render(<ClinicThemeProvider />)

    expect(useApplyClinicTheme).toHaveBeenCalled()
  })

  it('renders nothing (returns null)', () => {
    const { container } = render(<ClinicThemeProvider />)

    expect(container.firstChild).toBeNull()
  })
})
