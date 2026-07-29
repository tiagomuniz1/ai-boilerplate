import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from './database/database.module'
import { CacheModule } from './cache/cache.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { PatientsModule } from './modules/patients/patients.module'
import { ProfessionalsModule } from './modules/professionals/professionals.module'
import { SchedulesModule } from './modules/schedules/schedules.module'
import { AppointmentsModule } from './modules/appointments/appointments.module'
import { SpecialtiesModule } from './modules/specialties/specialties.module'
import { ClinicsModule } from './modules/clinics/clinics.module'
import { ClinicSpecialtiesModule } from './modules/clinic-specialties/clinic-specialties.module'
import { ThemesModule } from './modules/themes/themes.module'
import { ScheduleExceptionsModule } from './modules/schedule-exceptions/schedule-exceptions.module'
import { MedicalRecordCanonicalFieldsModule } from './modules/medical-record-canonical-fields/medical-record-canonical-fields.module'
import { MedicalRecordTemplatesModule } from './modules/medical-record-templates/medical-record-templates.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { MedicationsModule } from './modules/medications/medications.module'
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module'
import { PrescriptionTemplatesModule } from './modules/prescription-templates/prescription-templates.module'
import { MedicalCertificatesModule } from './modules/medical-certificates/medical-certificates.module'
import { ExamsModule } from './modules/exams/exams.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { AccessRequestsModule } from './modules/access-requests/access-requests.module'
import { ConsultationPhotosModule } from './modules/consultation-photos/consultation-photos.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { RolesGuard } from './modules/auth/guards/roles.guard'

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 300 },
    ]),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ProfessionalsModule,
    SchedulesModule,
    AppointmentsModule,
    SpecialtiesModule,
    ClinicsModule,
    ClinicSpecialtiesModule,
    ThemesModule,
    ScheduleExceptionsModule,
    MedicalRecordCanonicalFieldsModule,
    MedicalRecordTemplatesModule,
    MedicalRecordsModule,
    MedicationsModule,
    PrescriptionsModule,
    PrescriptionTemplatesModule,
    MedicalCertificatesModule,
    ExamsModule,
    DashboardModule,
    AccessRequestsModule,
    ConsultationPhotosModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
