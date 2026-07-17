import { API_URL } from '@/lib/constants'

export interface ICreateAccessRequestInput {
  fullName: string
  email: string
  clinicName: string
  phone?: string
}

export const accessRequestsService = {
  async create(input: ICreateAccessRequestInput): Promise<void> {
    const response = await fetch(`${API_URL}/access-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      throw new Error('Failed to submit access request')
    }
  },
}
