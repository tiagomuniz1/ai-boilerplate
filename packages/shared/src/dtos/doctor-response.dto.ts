export class DoctorUserDto {
  id!: string
  fullName!: string
  email!: string
  isActive!: boolean
}

export class DoctorCrmDto {
  id!: string
  number!: string
  state!: string
  isPrimary!: boolean
}

export class DoctorSpecialtyDto {
  id!: string
  name!: string
  rqe!: string | null
}

export class DoctorResponseDto {
  id!: string
  user!: DoctorUserDto
  crms!: DoctorCrmDto[]
  specialties!: DoctorSpecialtyDto[]
  bio!: string | null
  createdAt!: Date
  updatedAt!: Date
}
