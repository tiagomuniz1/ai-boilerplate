import { ClinicList } from '@/components/features/clinics/components/clinic-list'

export default function ClinicsPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="clinics-page">
      <ClinicList />
    </main>
  )
}
