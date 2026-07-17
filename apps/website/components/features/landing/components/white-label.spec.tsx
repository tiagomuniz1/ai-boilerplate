import { render, screen } from '@testing-library/react'
import { WhiteLabel } from './white-label'

describe('WhiteLabel', () => {
  it('renders the heading and the two login screenshots', () => {
    render(<WhiteLabel />)
    expect(
      screen.getByRole('heading', { name: 'O sistema com a cara da sua clínica.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByAltText('Tela de login do Pulso com a marca da clínica em tema escuro.'),
    ).toBeInTheDocument()
    expect(
      screen.getByAltText('Tela de login do Pulso com a marca da clínica em tema claro.'),
    ).toBeInTheDocument()
  })
})
