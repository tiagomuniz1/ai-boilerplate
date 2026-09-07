import { PatientGender } from '@app/shared'

/**
 * Calendário Nacional de Vacinação, como ponto de partida.
 *
 * O backoffice edita tudo isto sem deploy — foi a exigência: puxar do oficial e
 * poder ajustar. As idades estão em meses; `minIntervalDays` é o intervalo desde
 * a dose anterior, quando o esquema o exige.
 *
 * Cobertura deliberadamente parcial: as vacinas do calendário infantil e as de
 * adulto mais cobradas. Esquemas que dependem de condição clínica (renais,
 * imunossuprimidos) não entram — o sistema não conhece comorbidade, e apontar
 * pendência errada é pior que não apontar.
 */
export interface VaccineScheduleRuleSeed {
  vaccineName: string
  doseLabel: string
  doseOrder: number
  minAgeMonths: number
  maxAgeMonths?: number
  minIntervalDays?: number
  appliesToGender?: PatientGender
}

export const VACCINE_SCHEDULE_RULES: VaccineScheduleRuleSeed[] = [
  { vaccineName: 'BCG', doseLabel: 'Dose única', doseOrder: 1, minAgeMonths: 0, maxAgeMonths: 60 },

  { vaccineName: 'Hepatite B', doseLabel: 'Ao nascer', doseOrder: 1, minAgeMonths: 0 },

  { vaccineName: 'Penta', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 2 },
  { vaccineName: 'Penta', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 4, minIntervalDays: 60 },
  { vaccineName: 'Penta', doseLabel: '3ª dose', doseOrder: 3, minAgeMonths: 6, minIntervalDays: 60 },

  { vaccineName: 'Poliomielite inativada', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 2 },
  { vaccineName: 'Poliomielite inativada', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 4, minIntervalDays: 60 },
  { vaccineName: 'Poliomielite inativada', doseLabel: '3ª dose', doseOrder: 3, minAgeMonths: 6, minIntervalDays: 60 },
  { vaccineName: 'Poliomielite inativada', doseLabel: 'Reforço', doseOrder: 4, minAgeMonths: 15, minIntervalDays: 180 },

  { vaccineName: 'Rotavírus humano', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 2, maxAgeMonths: 4 },
  { vaccineName: 'Rotavírus humano', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 4, maxAgeMonths: 8, minIntervalDays: 30 },

  { vaccineName: 'Pneumocócica 10-valente', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 2 },
  { vaccineName: 'Pneumocócica 10-valente', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 4, minIntervalDays: 60 },
  { vaccineName: 'Pneumocócica 10-valente', doseLabel: 'Reforço', doseOrder: 3, minAgeMonths: 12, minIntervalDays: 60 },

  { vaccineName: 'Meningocócica C', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 3 },
  { vaccineName: 'Meningocócica C', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 5, minIntervalDays: 60 },
  { vaccineName: 'Meningocócica C', doseLabel: 'Reforço', doseOrder: 3, minAgeMonths: 12, minIntervalDays: 60 },

  { vaccineName: 'Febre amarela', doseLabel: 'Dose inicial', doseOrder: 1, minAgeMonths: 9 },
  { vaccineName: 'Febre amarela', doseLabel: 'Reforço', doseOrder: 2, minAgeMonths: 48, minIntervalDays: 30 },

  { vaccineName: 'Tríplice viral', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 12 },
  { vaccineName: 'Tríplice viral', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 15, minIntervalDays: 30 },

  { vaccineName: 'Hepatite A', doseLabel: 'Dose única', doseOrder: 1, minAgeMonths: 15, maxAgeMonths: 60 },

  { vaccineName: 'Difteria, tétano e coqueluche', doseLabel: '1º reforço', doseOrder: 1, minAgeMonths: 15 },
  { vaccineName: 'Difteria, tétano e coqueluche', doseLabel: '2º reforço', doseOrder: 2, minAgeMonths: 48, minIntervalDays: 180 },

  { vaccineName: 'Varicela', doseLabel: 'Dose única', doseOrder: 1, minAgeMonths: 15 },

  // Duas doses no esquema do calendário, para meninas e meninos.
  { vaccineName: 'HPV quadrivalente', doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 108, maxAgeMonths: 168 },
  { vaccineName: 'HPV quadrivalente', doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 114, maxAgeMonths: 180, minIntervalDays: 180 },

  { vaccineName: 'Difteria e tétano adulto', doseLabel: 'Reforço (a cada 10 anos)', doseOrder: 1, minAgeMonths: 84 },

  { vaccineName: 'Influenza', doseLabel: 'Dose anual', doseOrder: 1, minAgeMonths: 6 },
]
