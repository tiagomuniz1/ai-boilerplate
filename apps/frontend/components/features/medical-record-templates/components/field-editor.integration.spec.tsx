jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))

import { screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { MedicalRecordFieldType } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { FieldEditor } from './field-editor'
import type { ITemplateFormValues } from './template-form'

function Wrapper({ fieldPath }: { fieldPath?: string }) {
  const { control, register, formState: { errors } } = useForm<ITemplateFormValues>({
    defaultValues: {
      name: '',
      specialtyId: '',
      fields: [{ key: '', label: '', type: MedicalRecordFieldType.TEXT, required: false, order: 0, options: [], placeholder: '', helpText: '', canonical: false, canonicalKey: '', sectionKey: '' }],
      sections: [],
    },
  })

  return (
    <FieldEditor
      index={0}
      total={1}
      control={control}
      register={register}
      errors={errors}
      watchedType={MedicalRecordFieldType.TEXT}
      fieldPath={fieldPath}
      onMoveUp={jest.fn()}
      onMoveDown={jest.fn()}
      onRemove={jest.fn()}
    />
  )
}

describe('FieldEditor (integration)', () => {
  it('falls back to undefined errors when fieldPath does not match known patterns', async () => {
    renderWithProviders(<Wrapper fieldPath="other.0.fields" />)

    await waitFor(() => {
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
    })
  })
})
