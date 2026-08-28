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
    // `appointments.date` is a Postgres `date` column, so it arrives date-only.
    appointmentDate: '2026-01-04' as unknown as Date,
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
    // Asserted on the local calendar parts, not toISOString(): a date-only value
    // must land on the day it names, and the previous assertion encoded the very
    // shift this guards against.
    expect(model.appointmentDate.getFullYear()).toBe(2026)
    expect(model.appointmentDate.getMonth()).toBe(0)
    expect(model.appointmentDate.getDate()).toBe(4)
  })
})
