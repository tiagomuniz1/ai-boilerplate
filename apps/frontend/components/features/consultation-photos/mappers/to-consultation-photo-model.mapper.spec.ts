import { toConsultationPhotoModel } from './to-consultation-photo-model.mapper'

describe('toConsultationPhotoModel', () => {
  const dto = {
    id: 'photo-uuid',
    appointmentId: 'appointment-uuid',
    fileName: 'evolucao.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1000,
    createdAt: '2026-01-15T10:00:00.000Z' as unknown as Date,
  }

  it('maps all fields correctly', () => {
    const model = toConsultationPhotoModel(dto)

    expect(model.id).toBe('photo-uuid')
    expect(model.appointmentId).toBe('appointment-uuid')
    expect(model.fileName).toBe('evolucao.jpg')
    expect(model.mimeType).toBe('image/jpeg')
    expect(model.fileSizeBytes).toBe(1000)
  })

  it('converts createdAt string to Date instance', () => {
    const model = toConsultationPhotoModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2026-01-15T10:00:00.000Z')
  })
})
