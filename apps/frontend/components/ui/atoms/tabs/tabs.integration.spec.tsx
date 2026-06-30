import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { Tabs } from './tabs'

const items = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'prontuario', label: 'Prontuário' },
  { id: 'receitas', label: 'Receitas', count: 3 },
  { id: 'atestados', label: 'Atestados', count: 0 },
]

describe('Tabs', () => {
  it('renders all tab labels', () => {
    renderWithProviders(<Tabs items={items} activeId="resumo" onChange={jest.fn()} />)
    expect(screen.getByTestId('tab-resumo')).toHaveTextContent('Resumo')
    expect(screen.getByTestId('tab-prontuario')).toHaveTextContent('Prontuário')
    expect(screen.getByTestId('tab-receitas')).toBeInTheDocument()
  })

  it('marks active tab with aria-selected true', () => {
    renderWithProviders(<Tabs items={items} activeId="prontuario" onChange={jest.fn()} />)
    expect(screen.getByTestId('tab-prontuario')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('tab-resumo')).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with tab id when clicked', async () => {
    const onChange = jest.fn()
    renderWithProviders(<Tabs items={items} activeId="resumo" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('tab-prontuario'))
    expect(onChange).toHaveBeenCalledWith('prontuario')
  })

  it('shows count badge when count > 0', () => {
    renderWithProviders(<Tabs items={items} activeId="resumo" onChange={jest.fn()} />)
    expect(screen.getByTestId('tab-count-receitas')).toHaveTextContent('3')
  })

  it('does not show count badge when count is 0', () => {
    renderWithProviders(<Tabs items={items} activeId="resumo" onChange={jest.fn()} />)
    expect(screen.queryByTestId('tab-count-atestados')).not.toBeInTheDocument()
  })

  it('does not show count badge when count is undefined', () => {
    renderWithProviders(<Tabs items={items} activeId="resumo" onChange={jest.fn()} />)
    expect(screen.queryByTestId('tab-count-resumo')).not.toBeInTheDocument()
  })
})
