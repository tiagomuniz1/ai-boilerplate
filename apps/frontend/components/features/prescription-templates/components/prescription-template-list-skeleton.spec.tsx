import { render, screen } from '@testing-library/react'
import { PrescriptionTemplateListSkeleton } from './prescription-template-list-skeleton'

describe('PrescriptionTemplateListSkeleton', () => {
  it('renders the skeleton container', () => {
    render(<PrescriptionTemplateListSkeleton />)
    expect(screen.getByTestId('prescription-template-list-skeleton')).toBeInTheDocument()
  })
})
