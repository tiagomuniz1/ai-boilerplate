import type { IFaq, IFeature, ISecurityBullet, IStep } from '../types/landing.types'

export const TRUST_ITEMS: readonly string[] = [
  'Dados isolados por clínica (multi-tenant)',
  'Receitas verificáveis por QR Code',
  'Base de medicamentos ANVISA',
  'Feito para o fluxo real da clínica brasileira',
]

export const FEATURES: readonly IFeature[] = [
  {
    number: '01',
    title: 'Agenda inteligente',
    description:
      'Disponibilidade em tempo real a partir da agenda de cada médico, com duração de slot configurável, bloqueios de horário e visão por dia ou semana. Marque, confirme, conclua ou registre faltas.',
  },
  {
    number: '02',
    title: 'Prontuário por especialidade',
    description:
      'Formulários que se adaptam à especialidade da consulta. Campos padronizados (peso, pressão, alergias…) garantem dados consistentes — e cada prontuário guarda a versão do modelo usada, para auditoria.',
  },
  {
    number: '03',
    title: 'Receitas com verificação por QR',
    description:
      'Cada receita gera um PDF com a marca da clínica e um QR Code. Farmácia ou paciente escaneia e confirma a autenticidade numa página pública — com nome e CPF mascarados.',
  },
  {
    number: '04',
    title: 'Atestados e exames',
    description:
      'Atestados de afastamento e comparecimento e solicitações de exame em PDF branded, com resultados anexados e guardados com segurança.',
  },
  {
    number: '05',
    title: 'Base de medicamentos ANVISA',
    description:
      'Busca rápida na base oficial de medicamentos, com princípio ativo e classe terapêutica. Modelos de receita reutilizáveis para prescrever em um clique.',
  },
  {
    number: '06',
    title: 'Prontos para o Brasil',
    description:
      'Múltiplos CRMs por médico (com estado e registro principal), especialidades com RQE, convênio vs. particular e ranking de CID nos atestados.',
  },
]

export const STEPS: readonly IStep[] = [
  {
    number: '1',
    title: 'Crie sua clínica',
    description: 'Cadastro self-service em minutos. Sem burocracia.',
  },
  {
    number: '2',
    title: 'Configure sua marca e equipe',
    description:
      'Suba seu logo, escolha as cores, convide médicos e recepção (cada um com seu acesso).',
  },
  {
    number: '3',
    title: 'Atenda com tudo integrado',
    description:
      'Agenda, prontuário, receitas e relatórios funcionando desde o primeiro paciente.',
  },
]

export const SECURITY_BULLETS: readonly ISecurityBullet[] = [
  {
    title: 'Isolamento total por clínica',
    description: 'Cada tenant com seus dados estritamente separados.',
  },
  {
    title: 'Papéis e permissões',
    description:
      'Administrador, recepcionista e médico, cada um vê só o que deve. Médico acessa apenas os próprios pacientes e consultas.',
  },
  {
    title: 'Arquivos protegidos',
    description:
      'Logos e resultados de exame em armazenamento privado, servidos apenas por endpoints controlados. Nunca links públicos.',
  },
  {
    title: 'Documentos auditáveis',
    description:
      'Receitas, atestados e prontuários guardados como registros imutáveis com data e autoria.',
  },
  {
    title: 'Autenticação moderna',
    description:
      'Login com tokens, expiração e onboarding por link seguro (defina sua senha, sem senha trafegando).',
  },
  {
    title: 'Pensado para a LGPD',
    description: 'Dados sensíveis mascarados na verificação pública e minimizados por padrão.',
  },
]

export const FAQS: readonly IFaq[] = [
  {
    question: 'Preciso instalar algo?',
    answer: 'Não. O Pulso é 100% web; cada clínica acessa pelo seu próprio endereço.',
  },
  {
    question: 'Meus dados ficam separados dos de outras clínicas?',
    answer: 'Sim. Cada clínica é um ambiente isolado — ninguém acessa dados de outra.',
  },
  {
    question: 'Como funciona a verificação de receita por QR?',
    answer:
      'Cada receita traz um QR Code que leva a uma página pública de conferência. A farmácia ou o paciente confirma a autenticidade; dados sensíveis aparecem mascarados.',
  },
  {
    question: 'Dá para usar a marca da minha clínica?',
    answer: 'Sim. Logo, cores, favicon e endereço próprios — inclusive nos PDFs e e-mails.',
  },
  {
    question: 'A base de medicamentos é atualizada?',
    answer: 'Usamos a base pública da ANVISA, com busca rápida por nome e princípio ativo.',
  },
  {
    question: 'Quais perfis de acesso existem?',
    answer:
      'Administrador, recepcionista e médico — cada um com as permissões adequadas ao seu papel.',
  },
]

/**
 * Deterministic 6×6 checker pattern for the decorative QR placeholder on the hero card.
 * 1 = filled cell, 0 = transparent.
 */
export const QR_PATTERN: readonly number[] = [
  1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1,
  0, 1, 0, 1,
]
