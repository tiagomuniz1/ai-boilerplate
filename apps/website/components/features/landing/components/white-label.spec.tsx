import { render, screen } from '@testing-library/react'
import { WhiteLabel } from './white-label'

describe('WhiteLabel', () => {
  it('renders the heading and the two login placeholders', () => {
    render(<WhiteLabel />)
    expect(
      screen.getByRole('heading', { name: 'O sistema com a cara da sua clínica.' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/login clínica A/)).toBeInTheDocument()
    expect(screen.getByText(/login clínica B/)).toBeInTheDocument()
  })
})
