import { CanonicalFieldList } from '@/components/features/canonical-fields/components/canonical-field-list'

export default function CanonicalFieldsPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="canonical-fields-page">
      <CanonicalFieldList />
    </main>
  )
}
