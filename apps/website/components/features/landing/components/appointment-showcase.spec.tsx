import { render, screen } from '@testing-library/react'
import { AppointmentShowcase } from './appointment-showcase'

describe('AppointmentShowcase', () => {
  it('renders the heading and the screenshot', () => {
    render(<AppointmentShowcase />)
    expect(
      screen.getByRole('heading', { name: 'Cada consulta documentada, do início ao fim.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByAltText(
        'Tela de detalhe de uma consulta no Pulso, com dados do paciente e abas de resumo, prontuário, receitas, atestados e exames.',
      ),
    ).toBeInTheDocument()
  })
})
