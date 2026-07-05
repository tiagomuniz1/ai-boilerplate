import { TemplateList } from '@/components/features/medical-record-templates/components/template-list'

export default function MedicalRecordTemplatesPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="medical-record-templates-page">
      <TemplateList />
    </main>
  )
}
