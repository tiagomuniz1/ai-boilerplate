import { KinshipType } from '../enums/kinship-type.enum'

export const KINSHIP_TYPE_LABELS: Record<KinshipType, string> = {
  [KinshipType.FILHO]: 'Filho(a)',
  [KinshipType.CONJUGE]: 'Cônjuge',
  [KinshipType.PAI]: 'Pai',
  [KinshipType.MAE]: 'Mãe',
  [KinshipType.NETO]: 'Neto(a)',
  [KinshipType.TUTELADO]: 'Tutelado(a)',
  [KinshipType.OUTRO]: 'Outro',
}
