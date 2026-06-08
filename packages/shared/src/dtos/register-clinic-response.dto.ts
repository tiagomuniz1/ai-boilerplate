export class RegisterClinicResponseDto {
  clinic!: {
    id: string
    name: string
    slug: string
  }

  admin!: {
    id: string
    fullName: string
    email: string
  }
}
