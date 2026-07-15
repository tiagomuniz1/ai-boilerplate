import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Faq } from './faq'
import { FAQS } from '../constants/landing-content'

describe('Faq (integration)', () => {
  it('renders all questions collapsed by default', () => {
    const { container } = render(<Faq />)
    expect(container.querySelector('#perguntas')).toBeInTheDocument()
    expect(screen.getAllByTestId('faq-item')).toHaveLength(FAQS.length)
    expect(screen.queryByText(FAQS[0].answer)).not.toBeInTheDocument()
  })

  it('expands an answer on click and collapses it on a second click', async () => {
    const user = userEvent.setup()
    render(<Faq />)
    const firstHeader = screen.getByRole('button', { name: new RegExp(FAQS[0].question) })

    await user.click(firstHeader)
    expect(screen.getByText(FAQS[0].answer)).toBeInTheDocument()

    await user.click(firstHeader)
    expect(screen.queryByText(FAQS[0].answer)).not.toBeInTheDocument()
  })

  it('keeps only one answer open at a time', async () => {
    const user = userEvent.setup()
    render(<Faq />)
    await user.click(screen.getByRole('button', { name: new RegExp(FAQS[0].question) }))
    await user.click(screen.getByRole('button', { name: new RegExp(FAQS[1].question) }))

    expect(screen.queryByText(FAQS[0].answer)).not.toBeInTheDocument()
    expect(screen.getByText(FAQS[1].answer)).toBeInTheDocument()
  })
})
