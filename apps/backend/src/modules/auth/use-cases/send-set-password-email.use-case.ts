import { Injectable, Logger } from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { getEnvConfig } from '../../../config/env.config'
import { buildClinicUrl } from '../../../common/utils/clinic-url.utils'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { FindThemeByIdUseCase } from '../../themes/use-cases/find-theme-by-id.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IEmailAdapter } from '../adapters/email.adapter.interface'
import { IPasswordSetTokensRepository } from '../repositories/password-set-tokens.repository.interface'

@Injectable()
export class SendSetPasswordEmailUseCase extends BaseUseCase {
  private readonly logger = new Logger(SendSetPasswordEmailUseCase.name)
  private static readonly TTL_MS = 72 * 60 * 60 * 1000

  constructor(
    dataSource: DataSource,
    private readonly passwordSetTokensRepository: IPasswordSetTokensRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly emailAdapter: IEmailAdapter,
    private readonly findThemeByIdUseCase: FindThemeByIdUseCase,
  ) {
    super(dataSource)
  }

  async execute(userId: string, clinicId: string | null): Promise<void> {
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + SendSetPasswordEmailUseCase.TTL_MS)

    await this.passwordSetTokensRepository.create({ userId, clinicId, tokenHash, expiresAt })

    try {
      const user = await this.usersRepository.findById(userId, clinicId)
      if (!user) {
        this.logger.warn('User not found for set-password email', { context: SendSetPasswordEmailUseCase.name, userId })
        return
      }

      let slug: string | null = null
      let clinicName: string | undefined
      let clinicLogoUrl: string | undefined
      let accentColor: string | undefined
      let accentSoftColor: string | undefined

      if (clinicId) {
        try {
          const clinic = await this.findClinicByIdUseCase.execute(clinicId)
          slug = clinic.slug
          clinicName = clinic.name
          clinicLogoUrl = clinic.logoUrl ?? undefined

          if (clinic.themeId) {
            try {
              const theme = await this.findThemeByIdUseCase.execute(clinic.themeId)
              accentColor = theme.accentColor
              accentSoftColor = theme.accentSoftColor
            } catch {
              this.logger.warn('Theme not found for email branding — using default color', {
                context: SendSetPasswordEmailUseCase.name,
                clinicId,
              })
            }
          }
        } catch {
          this.logger.warn('Clinic not found for set-password email', { context: SendSetPasswordEmailUseCase.name, clinicId })
        }
      }

      // A clinic user's link must point at that clinic's own host, not at
      // FRONTEND_URL (the backoffice). Platform admins have no clinic and keep
      // the backoffice URL.
      const link = slug
        ? buildClinicUrl(slug, `/set-password?token=${token}`)
        : `${getEnvConfig().FRONTEND_URL}/set-password?token=${token}`

      await this.emailAdapter.sendSetPasswordEmail({
        to: user.email,
        recipientName: user.fullName,
        link,
        clinicName,
        clinicLogoUrl,
        accentColor,
        accentSoftColor,
      })
    } catch (error) {
      this.logger.warn('Failed to send set-password email', {
        context: SendSetPasswordEmailUseCase.name,
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
