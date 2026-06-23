jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'pulso' }),
}))

import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { BirthdayPanel } from './BirthdayPanel'

function makeBirthdays(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    patientId: `p${i}`,
    fullName: `Paciente ${i + 1}`,
    age: 30 + i,
  }))
}

describe('BirthdayPanel', () => {
  it('shows empty state when no birthdays', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={[]} />)
    expect(screen.getByText('Nenhum aniversariante hoje.')).toBeInTheDocument()
  })

  it('renders up to 5 birthdays without "Ver mais" button', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={makeBirthdays(5)} />)
    expect(screen.getByText('Paciente 1')).toBeInTheDocument()
    expect(screen.getByText('Paciente 5')).toBeInTheDocument()
    expect(screen.queryByTestId('birthday-ver-mais')).not.toBeInTheDocument()
  })

  it('shows only first 5 and "Ver mais" button when more than 5', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={makeBirthdays(10)} />)
    expect(screen.getByText('Paciente 1')).toBeInTheDocument()
    expect(screen.queryByText('Paciente 6')).not.toBeInTheDocument()
    expect(screen.getByTestId('birthday-ver-mais')).toBeInTheDocument()
    expect(screen.getByTestId('birthday-ver-mais')).toHaveTextContent('10')
  })

  it('opens modal with all birthdays when "Ver mais" is clicked', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={makeBirthdays(10)} />)
    fireEvent.click(screen.getByTestId('birthday-ver-mais'))
    const modal = screen.getByTestId('birthday-modal-overlay')
    expect(modal).toBeInTheDocument()
    expect(screen.getByTestId('birthday-search')).toBeInTheDocument()
    expect(within(modal).getAllByText(/Paciente \d+/)).toHaveLength(10)
  })

  it('filters modal list by name', () => {
    const birthdays = [
      { patientId: 'p1', fullName: 'Ana Costa', age: 32 },
      { patientId: 'p2', fullName: 'João Silva', age: 45 },
      { patientId: 'p3', fullName: 'Maria Lima', age: 28 },
      { patientId: 'p4', fullName: 'Carlos Souza', age: 50 },
      { patientId: 'p5', fullName: 'Beatriz Santos', age: 22 },
      { patientId: 'p6', fullName: 'Pedro Alves', age: 37 },
      { patientId: 'p7', fullName: 'Ana Souza', age: 41 },
    ]
    renderWithProviders(<BirthdayPanel todayBirthdays={birthdays} />)
    fireEvent.click(screen.getByTestId('birthday-ver-mais'))
    const modal = screen.getByTestId('birthday-modal-overlay')
    fireEvent.change(screen.getByTestId('birthday-search'), { target: { value: 'ana' } })
    expect(within(modal).getByText('Ana Costa')).toBeInTheDocument()
    expect(within(modal).getByText('Ana Souza')).toBeInTheDocument()
    expect(within(modal).queryByText('João Silva')).not.toBeInTheDocument()
  })

  it('shows "Nenhum resultado" when filter matches nothing', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={makeBirthdays(7)} />)
    fireEvent.click(screen.getByTestId('birthday-ver-mais'))
    const modal = screen.getByTestId('birthday-modal-overlay')
    fireEvent.change(screen.getByTestId('birthday-search'), { target: { value: 'xyzxyz' } })
    expect(within(modal).getByText('Nenhum resultado.')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={makeBirthdays(7)} />)
    fireEvent.click(screen.getByTestId('birthday-ver-mais'))
    expect(screen.getByTestId('birthday-modal-overlay')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('birthday-modal-close'))
    expect(screen.queryByTestId('birthday-modal-overlay')).not.toBeInTheDocument()
  })

  it('closes modal when clicking the overlay backdrop', () => {
    renderWithProviders(<BirthdayPanel todayBirthdays={makeBirthdays(7)} />)
    fireEvent.click(screen.getByTestId('birthday-ver-mais'))
    fireEvent.click(screen.getByTestId('birthday-modal-overlay'))
    expect(screen.queryByTestId('birthday-modal-overlay')).not.toBeInTheDocument()
  })
})
