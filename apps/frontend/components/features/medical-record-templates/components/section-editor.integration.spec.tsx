jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug'), useBasePath: () => '/clinic-slug' }))
jest.mock('../services/canonical-fields.service')

jest.mock('@/components/ui/molecules/sortable-list/sortable-list', () => ({
  SortableList: ({ onReorder, children }: any) => (
    <div>
      <button type="button" data-testid="mock-reorder-trigger" onClick={() => onReorder(0, 1)} />
      {children}
    </div>
  ),
  SortableItem: ({ children }: any) => children({}),
}))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { canonicalFieldsService } from '../services/canonical-fields.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SectionEditor } from './section-editor'
import type { ITemplateFormValues } from './template-form'

const makeField = (label: string) =>
  ({ key: undefined, label, required: false, order: 0, options: [], placeholder: '', helpText: '', canonical: false, canonicalKey: '', sectionKey: '' } as any)

function Wrapper({
  onMoveFieldToContainer,
  prePopulatedField,
  twoFields,
  moveToContainers,
  withTitleError,
}: {
  onMoveFieldToContainer?: (fieldIndex: number, targetId: string) => void
  prePopulatedField?: boolean
  twoFields?: boolean
  moveToContainers?: { id: string; label: string }[]
  withTitleError?: boolean
}) {
  const { control, register, formState: { errors }, watch, setError } = useForm<ITemplateFormValues>({
    defaultValues: {
      name: '',
      specialtyId: '',
      fields: [],
      sections: [{
        key: 's1',
        title: '',
        order: 0,
        fields: twoFields
          ? [makeField('Campo 1'), makeField('Campo 2')]
          : prePopulatedField
            ? [makeField('Campo')]
            : [],
      }],
    },
  })

  useEffect(() => {
    if (withTitleError) {
      setError('sections.0.title', { message: 'Título da seção obrigatório' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SectionEditor
      sectionIndex={0}
      totalSections={1}
      control={control}
      register={register}
      errors={errors}
      watch={watch}
      onMoveUp={jest.fn()}
      onMoveDown={jest.fn()}
      onRemove={jest.fn()}
      onMoveFieldToContainer={onMoveFieldToContainer}
      fieldMoveToContainers={moveToContainers}
    />
  )
}

describe('SectionEditor (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])
  })

  it('does not render move-to select on field when onMoveFieldToContainer is not provided', async () => {
    renderWithProviders(<Wrapper />)

    await userEvent.click(screen.getByTestId('section-editor-add-field-0'))

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('field-editor-move-to-0')).not.toBeInTheDocument()
  })

  it('renders pre-populated field using field.type fallback when watchedType is nullish', async () => {
    renderWithProviders(<Wrapper prePopulatedField />)

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
    })
  })

  it('adopts a canonical field, appending it to the fields list', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([
      { id: 'canon-1', canonicalKey: 'blood_pressure', label: 'Pressão arterial', type: 'text', options: null, unit: null, specialtyId: null, description: null, isActive: true },
    ])

    renderWithProviders(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-picker-adopt-canon-1')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('canonical-field-picker-adopt-canon-1'))

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
    })
    expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Pressão arterial')
  })

  it('adopts a canonical field with options, mapping them into the new field', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'canon-2',
        canonicalKey: 'smoking_status',
        label: 'Tabagismo',
        type: 'select',
        options: [{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }],
        unit: null,
        specialtyId: null,
        description: null,
        isActive: true,
      },
    ])

    renderWithProviders(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-picker-adopt-canon-2')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('canonical-field-picker-adopt-canon-2'))

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
    })
    expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Tabagismo')
  })

  it('moves a field up, down and removes it', async () => {
    renderWithProviders(<Wrapper twoFields />)

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-1')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('field-editor-move-down-0'))
    await waitFor(() => {
      expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Campo 2')
    })

    await userEvent.click(screen.getByTestId('field-editor-move-up-1'))
    await waitFor(() => {
      expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Campo 1')
    })

    await userEvent.click(screen.getByTestId('field-editor-remove-0'))
    await waitFor(() => {
      expect(screen.queryByTestId('field-editor-1')).not.toBeInTheDocument()
    })
  })

  it('calls onMoveFieldToContainer with the field index and target id', async () => {
    const onMoveFieldToContainer = jest.fn()
    renderWithProviders(
      <Wrapper
        prePopulatedField
        moveToContainers={[{ id: 'target-section', label: 'Outra seção' }]}
        onMoveFieldToContainer={onMoveFieldToContainer}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-move-to-0')).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('field-editor-move-to-0'), 'target-section')

    expect(onMoveFieldToContainer).toHaveBeenCalledWith(0, 'target-section')
  })

  it('reorders fields via drag and drop', async () => {
    renderWithProviders(<Wrapper twoFields />)

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-1')).toBeInTheDocument()
    })
    expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Campo 1')

    await userEvent.click(screen.getByTestId('mock-reorder-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Campo 2')
    })
  })

  it('shows section title validation error', async () => {
    renderWithProviders(<Wrapper withTitleError />)

    await waitFor(() => {
      expect(screen.getByTestId('section-editor-title-0')).toBeInTheDocument()
    })

    expect(screen.getByText('Título da seção obrigatório')).toBeInTheDocument()
  })
})
