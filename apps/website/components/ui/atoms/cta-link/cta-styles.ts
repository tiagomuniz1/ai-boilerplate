export type CtaVariant = 'primary' | 'outline' | 'wine' | 'white'
export type CtaSize = 'sm' | 'md' | 'lg'

export const ctaBaseClasses =
  'inline-flex items-center justify-center text-center transition-colors duration-150'

export const ctaVariantClasses: Record<CtaVariant, string> = {
  primary: 'bg-terracotta text-white hover:bg-terracotta-hover',
  outline:
    'border border-warm-white/30 text-warm-white hover:border-terracotta hover:text-terracotta',
  wine: 'bg-wine text-white hover:bg-wine-hover',
  white: 'bg-warm-white text-wine hover:bg-white',
}

export const ctaSizeClasses: Record<CtaSize, string> = {
  sm: 'px-5 py-2.5 text-base font-semibold rounded-md',
  md: 'px-7 py-4 text-md font-bold rounded-lg',
  lg: 'px-8 py-4 text-md font-bold rounded-lg',
}
