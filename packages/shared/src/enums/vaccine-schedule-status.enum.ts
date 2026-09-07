/** Situação de uma vacina para um paciente, calculada a partir do calendário. */
export enum VaccineScheduleStatus {
  /** Todas as doses devidas até a idade atual foram tomadas. */
  EM_DIA = 'em_dia',
  /** A próxima dose já é devida, e a janela ainda não fechou. */
  PENDENTE = 'pendente',
  /** A janela da dose passou e ela não foi tomada. */
  ATRASADA = 'atrasada',
  /** Ainda não chegou a idade da primeira dose devida. */
  FUTURA = 'futura',
  /** O profissional dispensou, ou a regra não vale para este paciente. */
  NAO_SE_APLICA = 'nao_se_aplica',
}
