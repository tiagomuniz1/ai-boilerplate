// Only professions that run their own office-style consultations register on the
// platform — no COREN (nursing) and no CREF (educação física/personal trainer):
// neither holds independent scheduled patient consultations here, so they never
// need to be registered as a professional or manage a schedule.
export enum CouncilType {
  CRM = 'crm',
  CRN = 'crn',
  CREFITO = 'crefito',
  CRP = 'crp',
  CRO = 'cro',
  CRFA = 'crfa',
}
