import { render, screen } from '@testing-library/react'
import { SecurityCard } from './security-card'

describe('SecurityCard', () => {
  it('renders the title and description', () => {
    render(<SecurityCard title="Isolamento total" description="dados separados" />)
    expect(screen.getByText('Isolamento total')).toBeInTheDocument()
    expect(screen.getByText('dados separados')).toBeInTheDocument()
  })
})
