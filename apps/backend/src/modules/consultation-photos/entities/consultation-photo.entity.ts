import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('consultation_photos')
export class ConsultationPhoto {
  @PrimaryColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'appointment_id', type: 'uuid' })
  appointmentId: string

  // Denormalized from the appointment at upload time — the patient gallery (find-by-patient)
  // filters directly on this table without joining `appointments`.
  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  // S3 object key (or local relative path) — never a public URL. Files are
  // private; access always goes through DownloadConsultationPhotoFileUseCase.
  @Column({ name: 'file_path', type: 'text' })
  filePath: string

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string

  @Column({ name: 'file_size_bytes', type: 'int' })
  fileSizeBytes: number

  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  uploadedByUserId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
