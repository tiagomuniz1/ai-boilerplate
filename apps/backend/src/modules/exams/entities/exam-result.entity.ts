import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('exam_results')
export class ExamResult {
  @PrimaryColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'exam_request_id', type: 'uuid' })
  examRequestId: string

  // S3 object key (or local relative path) — never a public URL. Files are
  // private; access always goes through DownloadExamResultFileUseCase.
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
