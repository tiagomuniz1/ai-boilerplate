import { useQuery } from '@tanstack/react-query'
import { verifyPrescriptionUseCase } from '../use-cases/verify-prescription.use-case'

export function usePrescriptionVerification(token: string) {
  return useQuery({
    queryKey: ['prescription-verification', token],
    queryFn: () => verifyPrescriptionUseCase(token),
    retry: 0,
  })
}
