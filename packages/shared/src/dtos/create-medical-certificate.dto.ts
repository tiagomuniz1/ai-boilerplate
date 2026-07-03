import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import { MedicalCertificateType } from '../enums/medical-certificate-type.enum'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export class CreateMedicalCertificateDto {
  @IsUUID()
  appointmentId: string

  @IsEnum(MedicalCertificateType)
  type: MedicalCertificateType

  @ValidateIf((o) => o.type === MedicalCertificateType.LEAVE)
  @IsInt()
  @Min(1)
  @Max(365)
  daysOff: number

  @ValidateIf((o) => o.type === MedicalCertificateType.LEAVE)
  @IsDateString()
  startDate: string

  @ValidateIf((o) => o.type === MedicalCertificateType.LEAVE)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cidCode?: string

  @ValidateIf((o) => o.type === MedicalCertificateType.ATTENDANCE)
  @IsDateString()
  attendanceDate: string

  @ValidateIf((o) => o.type === MedicalCertificateType.ATTENDANCE)
  @IsString()
  @Matches(TIME_REGEX)
  checkInTime: string

  @ValidateIf((o) => o.type === MedicalCertificateType.ATTENDANCE)
  @IsString()
  @Matches(TIME_REGEX)
  checkOutTime: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string
}
