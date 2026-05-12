export class DoctorUserDto {
  id!: string
  fullName!: string
  email!: string
}

export class DoctorResponseDto {
  id!: string
  user!: DoctorUserDto
  crmNumber!: string
  specialty!: string
  bio!: string | null
  createdAt!: Date
  updatedAt!: Date
}
