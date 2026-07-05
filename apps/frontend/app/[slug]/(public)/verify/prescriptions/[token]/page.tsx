import { PrescriptionVerification } from '@/components/features/prescription-verification/components/prescription-verification'

export default function VerifyPrescriptionPage({
  params,
}: {
  params: { slug: string; token: string }
}) {
  return <PrescriptionVerification token={params.token} />
}
