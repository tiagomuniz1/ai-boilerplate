import { PrescriptionTemplateList } from '@/components/features/prescription-templates/components/prescription-template-list'

export default function PrescriptionTemplatesPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="prescription-templates-page">
      <PrescriptionTemplateList />
    </main>
  )
}
