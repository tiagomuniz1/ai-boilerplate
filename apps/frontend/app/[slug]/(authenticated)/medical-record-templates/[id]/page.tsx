import { TemplateDetails } from '@/components/features/medical-record-templates/components/template-details'

interface MedicalRecordTemplateDetailsPageProps {
  params: { id: string }
}

export default function MedicalRecordTemplateDetailsPage({ params }: MedicalRecordTemplateDetailsPageProps) {
  return (
    <main className="p-8" data-testid="medical-record-template-details-page">
      <TemplateDetails templateId={params.id} />
    </main>
  )
}
