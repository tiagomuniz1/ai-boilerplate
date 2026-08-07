// Subscription plan a clinic is on. Values are stable identifiers persisted in the
// DB — they never change when a plan's display name/limit/price changes (those live
// in config/subscription-plan.config.ts). Assigned only by PLATFORM_ADMIN.
export enum SubscriptionPlan {
  FREE = 'free',
  SOLO = 'solo',
  CLINICA = 'clinica',
  GRUPO = 'grupo',
  REDE = 'rede',
}
