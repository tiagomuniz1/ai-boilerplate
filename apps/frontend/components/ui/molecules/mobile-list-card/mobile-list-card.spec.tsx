import { render, screen } from '@testing-library/react'
import { MobileListCard } from './mobile-list-card'

describe('MobileListCard', () => {
  it('renders the title', () => {
    render(
      <ul>
        <MobileListCard title="Maria Aurea de Andrade Borba" rows={[]} data-testid="card-1" />
      </ul>,
    )
    expect(screen.getByTestId('card-1-title')).toHaveTextContent('Maria Aurea de Andrade Borba')
  })

  it('renders each row with label and value', () => {
    render(
      <ul>
        <MobileListCard
          title="Item"
          rows={[
            { label: 'Dia da semana', value: 'Sexta-feira' },
            { label: 'Horário', value: '08:00 – 18:00' },
          ]}
        />
      </ul>,
    )
    expect(screen.getByText('Dia da semana')).toBeInTheDocument()
    expect(screen.getByText('Sexta-feira')).toBeInTheDocument()
    expect(screen.getByText('Horário')).toBeInTheDocument()
    expect(screen.getByText('08:00 – 18:00')).toBeInTheDocument()
  })

  it('renders an optional icon next to the row label', () => {
    render(
      <ul>
        <MobileListCard
          title="Item"
          rows={[{ icon: <span data-testid="row-icon" />, label: 'Validade', value: 'Indefinida' }]}
        />
      </ul>,
    )
    expect(screen.getByTestId('row-icon')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <ul>
        <MobileListCard
          title="Item"
          rows={[]}
          actions={<button type="button">Excluir</button>}
        />
      </ul>,
    )
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('does not render the actions row when actions is not provided', () => {
    const { container } = render(
      <ul>
        <MobileListCard title="Item" rows={[]} />
      </ul>,
    )
    expect(container.querySelector('.border-t')).not.toBeInTheDocument()
  })

  it('applies the data-testid to the list item', () => {
    render(
      <ul>
        <MobileListCard title="Item" rows={[]} data-testid="card-uuid" />
      </ul>,
    )
    expect(screen.getByTestId('card-uuid')).toBeInTheDocument()
  })
})
