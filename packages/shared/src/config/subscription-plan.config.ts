import { SubscriptionPlan } from '../enums/subscription-plan.enum'

// SINGLE SOURCE OF TRUTH for subscription plans — edit a label, a professional
// limit, or a price here (one line each) and it flows through the whole platform
// (enforcement, backoffice UI, pricing display). The enum values stay stable in
// the DB; everything mutable about a plan lives here.
export interface SubscriptionPlanConfig {
  label: string
  // null = unlimited professionals (Free during validation; Rede is negotiated).
  maxProfessionals: number | null
  // Price in cents (integer, no float issues). 0 = free; null = "sob consulta" (Rede).
  monthlyPriceInCents: number | null
  // true → monthlyPriceInCents is charged PER professional; false → flat monthly.
  pricePerProfessional: boolean
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  [SubscriptionPlan.FREE]: {
    label: 'Grátis',
    maxProfessionals: null,
    monthlyPriceInCents: 0,
    pricePerProfessional: false,
  },
  [SubscriptionPlan.SOLO]: {
    label: 'Solo',
    maxProfessionals: 1,
    monthlyPriceInCents: 9900,
    pricePerProfessional: false,
  },
  [SubscriptionPlan.CLINICA]: {
    label: 'Clínica',
    maxProfessionals: 5,
    monthlyPriceInCents: 7900,
    pricePerProfessional: true,
  },
  [SubscriptionPlan.GRUPO]: {
    label: 'Grupo',
    maxProfessionals: 15,
    monthlyPriceInCents: 5900,
    pricePerProfessional: true,
  },
  [SubscriptionPlan.REDE]: {
    label: 'Rede',
    maxProfessionals: null,
    monthlyPriceInCents: null,
    pricePerProfessional: false,
  },
}
