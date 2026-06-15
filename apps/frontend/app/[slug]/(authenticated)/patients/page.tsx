import { PatientList } from '@/components/features/patients/components/patient-list'

export default function PatientsPage() {
  return (
    <main className="p-8" data-testid="patients-page">
      <PatientList />
    </main>
  )
}
