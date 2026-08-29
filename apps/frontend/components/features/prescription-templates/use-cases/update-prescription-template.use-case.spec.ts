jest.mock('../services/prescription-templates.service')
jest.mock('../mappers/to-prescription-template-model.mapper')

import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'
import { updatePrescriptionTemplateUseCase } from './update-prescription-template.use-case'

const mockService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>
const mockToModel = toPrescriptionTemplateModel as jest.Mock

describe('updatePrescriptionTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.update with name when provided', async () => {
    const responseDto = { id: 'tpl-uuid' }
    const model = { id: 'tpl-uuid' }
    mockService.update.mockResolvedValue(responseDto as any)
    mockToModel.mockReturnValue(model)

    const result = await updatePrescriptionTemplateUseCase('tpl-uuid', { name: 'Novo nome' })

    expect(mockService.update).toHaveBeenCalledWith('tpl-uuid', { name: 'Novo nome' })
    expect(mockToModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('omits name when not provided', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', { isActive: false })

    const call = mockService.update.mock.calls[0][1]
    expect(call).not.toHaveProperty('name')
  })

  it('includes notes when provided', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', { notes: 'Nova observação' })

    const call = mockService.update.mock.calls[0][1]
    expect(call).toMatchObject({ notes: 'Nova observação' })
  })

  it('includes isActive when provided', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', { isActive: false })

    const call = mockService.update.mock.calls[0][1]
    expect(call).toMatchObject({ isActive: false })
  })

  it('includes professionalId when provided', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', { professionalId: 'doctor-uuid' })

    const call = mockService.update.mock.calls[0][1]
    expect(call).toMatchObject({ professionalId: 'doctor-uuid' })
  })

  it('maps items when provided, resolving medicationId', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', {
      items: [{ medicationId: 'med-uuid', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp' }],
    })

    const call = mockService.update.mock.calls[0][1]
    expect(call.items?.[0]).toEqual({
      medicationId: 'med-uuid',
      dosage: '500mg',
      quantity: '1 caixa',
      instructions: 'Tomar 1 cp',
    })
  })

  it('maps items when provided, resolving activeIngredientName', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', {
      items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp' }],
    })

    const call = mockService.update.mock.calls[0][1]
    expect(call.items?.[0]).toEqual({
      activeIngredientName: 'Amoxicilina',
      instructions: 'Tomar 1 cp',
    })
  })

  it('omits items when not provided', async () => {
    mockService.update.mockResolvedValue({} as any)

    await updatePrescriptionTemplateUseCase('tpl-uuid', { name: 'X' })

    const call = mockService.update.mock.calls[0][1]
    expect(call).not.toHaveProperty('items')
  })

  it('propagates service errors', async () => {
    mockService.update.mockRejectedValue({ status: 403 })
    await expect(updatePrescriptionTemplateUseCase('tpl-uuid', { name: 'X' })).rejects.toMatchObject({ status: 403 })
  })
})
