jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('../services/canonical-fields.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { canonicalFieldsService } from '../services/canonical-fields.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SectionEditor } from './section-editor'
import type { ITemplateFormValues } from './template-form'

function Wrapper({
  onMoveFieldToContainer,
  prePopulatedField,
}: {
  onMoveFieldToContainer?: (fieldIndex: number, targetId: string) => void
  prePopulatedField?: boolean
}) {
  const { control, register, formState: { errors }, watch } = useForm<ITemplateFormValues>({
    defaultValues: {
      name: '',
      specialtyId: '',
      fields: [],
      sections: [{
        key: 's1',
        title: '',
        order: 0,
        fields: prePopulatedField
          ? [{ key: undefined, label: 'Campo', required: false, order: 0, options: [], placeholder: '', helpText: '', canonical: false, canonicalKey: '', sectionKey: '' } as any]
          : [],
      }],
    },
  })

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
})
