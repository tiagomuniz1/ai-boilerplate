import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ClinicDetailsSkeleton } from './clinic-details-skeleton'

describe('ClinicDetailsSkeleton', () => {
  it('renders the skeleton container', () => {
    renderWithProviders(<ClinicDetailsSkeleton />)

    expect(screen.getByTestId('clinic-details-skeleton')).toBeInTheDocument()
  })
})
