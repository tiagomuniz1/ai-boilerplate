import { render, screen } from '@testing-library/react'
import { FormField } from './form-field'

describe('FormField', () => {
    it('renders label associated with htmlFor', () => {
        render(
            <FormField label="Email" htmlFor="email">
                <input id="email" />
            </FormField>,
        )
        expect(screen.getByText('Email').closest('label')).toHaveAttribute('for', 'email')
    })

    it('renders children', () => {
        render(
            <FormField label="Email" htmlFor="email">
                <input id="email" data-testid="input" />
            </FormField>,
        )
        expect(screen.getByTestId('input')).toBeInTheDocument()
    })

    it('renders error message when error is provided', () => {
        render(
            <FormField label="Email" htmlFor="email" error="Campo obrigatório">
                <input id="email" />
            </FormField>,
        )
        expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
    })

    it('does not render error when not provided', () => {
        render(
            <FormField label="Email" htmlFor="email">
                <input id="email" />
            </FormField>,
        )
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('passes required to label', () => {
        render(
            <FormField label="Email" htmlFor="email" required>
                <input id="email" />
            </FormField>,
        )
        expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('merges className prop', () => {
        const { container } = render(
            <FormField label="Email" htmlFor="email" className="custom-class">
                <input id="email" />
            </FormField>,
        )
        expect(container.firstChild).toHaveClass('custom-class')
    })
})
