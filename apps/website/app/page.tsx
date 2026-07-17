import { Navbar } from '@/components/features/landing/components/navbar'
import { Hero } from '@/components/features/landing/components/hero'
import { TrustBar } from '@/components/features/landing/components/trust-bar'
import { Features } from '@/components/features/landing/components/features'
import { DashboardShowcase } from '@/components/features/landing/components/dashboard-showcase'
import { AppointmentShowcase } from '@/components/features/landing/components/appointment-showcase'
import { WhiteLabel } from '@/components/features/landing/components/white-label'
import { HowItWorks } from '@/components/features/landing/components/how-it-works'
import { Security } from '@/components/features/landing/components/security'
import { SocialProof } from '@/components/features/landing/components/social-proof'
import { Faq } from '@/components/features/landing/components/faq'
import { FinalCta } from '@/components/features/landing/components/final-cta'
import { Footer } from '@/components/features/landing/components/footer'
import { AccessRequestModal } from '@/components/features/landing/components/access-request-modal'

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <DashboardShowcase />
      <AppointmentShowcase />
      <WhiteLabel />
      <HowItWorks />
      <Security />
      <SocialProof />
      <Faq />
      <FinalCta />
      <Footer />
      <AccessRequestModal />
    </main>
  )
}
