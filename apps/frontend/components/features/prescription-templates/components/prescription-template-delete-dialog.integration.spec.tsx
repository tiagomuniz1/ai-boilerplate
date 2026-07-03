import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionTemplateDeleteDialog } from './prescription-template-delete-dialog'

describe('PrescriptionTemplateDeleteDialog', () => {
  it('renders when open', () => {
    renderWithProviders(
      <PrescriptionTemplateDeleteDialog isOpen isPending={false} onClose={jest.fn()} onConfirm={jest.fn()} />,
    )
    expect(screen.getByTestId('prescription-template-delete-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-delete-dialog-message')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    renderWithProviders(
      <PrescriptionTemplateDeleteDialog isOpen={false} isPending={false} onClose={jest.fn()} onConfirm={jest.fn()} />,
    )
    expect(screen.queryByTestId('prescription-template-delete-dialog-message')).not.toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn()
    renderWithProviders(
      <PrescriptionTemplateDeleteDialog isOpen isPending={false} onClose={onClose} onConfirm={jest.fn()} />,
    )
    await userEvent.click(screen.getByTestId('prescription-template-delete-dialog-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onConfirm when confirm is clicked', async () => {
    const onConfirm = jest.fn()
    renderWithProviders(
      <PrescriptionTemplateDeleteDialog isOpen isPending={false} onClose={jest.fn()} onConfirm={onConfirm} />,
    )
    await userEvent.click(screen.getByTestId('prescription-template-delete-dialog-confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('disables buttons when isPending', () => {
    renderWithProviders(
      <PrescriptionTemplateDeleteDialog isOpen isPending onClose={jest.fn()} onConfirm={jest.fn()} />,
    )
    expect(screen.getByTestId('prescription-template-delete-dialog-cancel')).toBeDisabled()
    expect(screen.getByTestId('prescription-template-delete-dialog-confirm')).toBeDisabled()
  })
})
