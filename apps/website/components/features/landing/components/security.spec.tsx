import { render, screen } from '@testing-library/react'
import { Security } from './security'
import { SECURITY_BULLETS } from '../constants/landing-content'

describe('Security', () => {
  it('renders the heading and every security card', () => {
    const { container } = render(<Security />)
    expect(container.querySelector('#seguranca')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Segurança não é recurso — é fundação.' }),
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('security-card')).toHaveLength(SECURITY_BULLETS.length)
  })
})
