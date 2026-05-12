import { DoctorList } from '@/components/features/doctors/components/doctor-list'

export default function DoctorsPage() {
  return (
    <main className="p-8" data-testid="doctors-page">
      <DoctorList />
    </main>
  )
}
