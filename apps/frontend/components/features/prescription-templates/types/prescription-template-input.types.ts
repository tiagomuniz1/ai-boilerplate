export interface ICreatePrescriptionTemplateItemInput {
  medicationId?: string
  activeIngredientName?: string
  dosage?: string
  quantity?: string
  instructions: string
}

export interface ICreatePrescriptionTemplateInput {
  name: string
  items: ICreatePrescriptionTemplateItemInput[]
  notes?: string
  doctorId?: string
}

export interface IUpdatePrescriptionTemplateInput {
  name?: string
  items?: ICreatePrescriptionTemplateItemInput[]
  notes?: string
  isActive?: boolean
  doctorId?: string
}
