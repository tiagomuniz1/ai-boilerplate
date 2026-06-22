jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('../services/canonical-fields.service')
jest.mock('../../specialties/services/specialties.service')

interface CapturedList { onReorder: (from: number, to: number) => void; idsLength: number }
const capturedLists: CapturedList[] = []

jest.mock('@/components/ui/molecules/sortable-list/sortable-list', () => ({
  SortableList: ({ onReorder, ids, children }: any) => {
    capturedLists.push({ onReorder, idsLength: (ids ?? []).length })
    return <div>{children}</div>
  },
  SortableItem: ({ children }: any) => (
    <div>{typeof children === 'function' ? children({}) : children}</div>
  ),
}))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { canonicalFieldsService } from '../services/canonical-fields.service'
import { specialtiesService } from '../../specialties/services/specialties.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { TemplateForm } from './template-form'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

const emptySpecialties = { data: [], total: 0, page: 1, limit: 100 }

describe('TemplateForm — DnD reorder callbacks', () => {
  beforeEach(() => {
    capturedLists.length = 0
    jest.clearAllMocks()
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(emptySpecialties)
  })

  it('invokes flat fields onReorder lambda when SortableList fires reorder', async () => {
    renderWithProviders(
      <TemplateForm mode="create" specialtyId="spec-uuid" onSubmit={jest.fn()} isPending={false} />,
    )

    await userEvent.click(screen.getByTestId('template-form-add-field'))
    await userEvent.click(screen.getByTestId('template-form-add-field'))
    await waitFor(() => expect(screen.getAllByTestId(/^field-editor-\d+$/).length).toBe(2))

    // Find the SortableList that holds 2 flat fields
    const flatList = capturedLists.find((l) => l.idsLength === 2)
    expect(flatList).toBeDefined()
    flatList!.onReorder(0, 1)

    await waitFor(() => expect(screen.getByTestId('field-editor-0')).toBeInTheDocument())
  })

  it('invokes sections onReorder lambda when SortableList fires reorder', async () => {
    renderWithProviders(
      <TemplateForm mode="create" specialtyId="spec-uuid" onSubmit={jest.fn()} isPending={false} />,
    )

    await userEvent.click(screen.getByTestId('template-form-add-section'))
    await userEvent.click(screen.getByTestId('template-form-add-section'))
    await waitFor(() => expect(screen.getAllByTestId(/^section-editor-\d+$/).length).toBe(2))

    // The sections SortableList is the only one with idsLength === 2 (one per section)
    const sectionsListEntry = capturedLists.find((l) => l.idsLength === 2)
    expect(sectionsListEntry).toBeDefined()
    sectionsListEntry!.onReorder(0, 1)

    await waitFor(() => expect(screen.getByTestId('section-editor-0')).toBeInTheDocument())
  })
})
