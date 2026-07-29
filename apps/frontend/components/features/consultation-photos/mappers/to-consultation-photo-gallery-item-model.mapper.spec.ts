import { toConsultationPhotoGalleryItemModel } from './to-consultation-photo-gallery-item-model.mapper'

describe('toConsultationPhotoGalleryItemModel', () => {
  const dto = {
    id: 'photo-uuid',
    appointmentId: 'appointment-uuid',
    fileName: 'evolucao.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1000,
    createdAt: '2026-01-05T10:00:00.000Z' as unknown as Date,
    professionalName: 'Ana Nutri',
    appointmentDate: '2026-01-04T00:00:00.000Z' as unknown as Date,
  }

  it('maps all fields correctly, including professionalName', () => {
    const model = toConsultationPhotoGalleryItemModel(dto)

    expect(model.id).toBe('photo-uuid')
    expect(model.fileName).toBe('evolucao.jpg')
    expect(model.professionalName).toBe('Ana Nutri')
  })

  it('converts createdAt and appointmentDate strings to Date instances', () => {
    const model = toConsultationPhotoGalleryItemModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2026-01-05T10:00:00.000Z')
    expect(model.appointmentDate).toBeInstanceOf(Date)
    expect(model.appointmentDate.toISOString()).toBe('2026-01-04T00:00:00.000Z')
  })
})
