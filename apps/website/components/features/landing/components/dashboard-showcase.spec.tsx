import { render, screen } from '@testing-library/react'
import { DashboardShowcase } from './dashboard-showcase'

describe('DashboardShowcase', () => {
  it('renders the heading and the screenshot placeholder', () => {
    render(<DashboardShowcase />)
    expect(
      screen.getByRole('heading', { name: 'Enxergue a clínica inteira em uma tela.' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/KPIs · gráficos · aniversariantes/)).toBeInTheDocument()
  })
})
