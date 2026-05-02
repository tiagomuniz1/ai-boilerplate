import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './modal'

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
    const onClose = jest.fn()
    render(
        <Modal isOpen={true} onClose={onClose} {...props}>
            <p>Conteúdo</p>
        </Modal>,
    )
    return { onClose }
}

describe('Modal', () => {
    it('renders nothing when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={jest.fn()}>
                <p>Conteúdo</p>
            </Modal>,
        )
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when isOpen is true', () => {
        renderModal()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders title when provided', () => {
        renderModal({ title: 'Confirmar ação' })
        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Confirmar ação')
    })

    it('renders children', () => {
        renderModal()
        expect(screen.getByText('Conteúdo')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
        const { onClose } = renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Esc key is pressed', async () => {
        const { onClose } = renderModal()
        await userEvent.keyboard('{Escape}')
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', async () => {
        const { onClose } = renderModal()
        await userEvent.click(screen.getByTestId('modal-backdrop'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose when dialog content is clicked', async () => {
        const { onClose } = renderModal()
        await userEvent.click(screen.getByRole('dialog'))
        expect(onClose).not.toHaveBeenCalled()
    })

    it('dialog has aria-modal attribute', () => {
        renderModal()
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('merges className prop', () => {
        renderModal({ className: 'custom-class' })
        expect(screen.getByRole('dialog')).toHaveClass('custom-class')
    })

    it('restores focus to previously focused element when modal closes', () => {
        const button = document.createElement('button')
        document.body.appendChild(button)
        button.focus()

        const { rerender } = render(
            <Modal isOpen={true} onClose={jest.fn()}>
                <p>Conteúdo</p>
            </Modal>,
        )

        rerender(
            <Modal isOpen={false} onClose={jest.fn()}>
                <p>Conteúdo</p>
            </Modal>,
        )

        expect(document.activeElement).toBe(button)
        button.remove()
    })
})
