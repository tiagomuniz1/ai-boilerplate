import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import * as CircuitBreaker from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import {
  IAccessRequestEmailAdapter,
  ISendAccessRequestEmailParams,
} from './access-request-email.adapter.interface'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

@Injectable()
export class AccessRequestEmailAdapter implements IAccessRequestEmailAdapter {
  private readonly logger = new Logger(AccessRequestEmailAdapter.name)
  private readonly breaker: CircuitBreaker<[ISendAccessRequestEmailParams], void>

  constructor() {
    this.breaker = new CircuitBreaker(
      (params: ISendAccessRequestEmailParams) => this.send(params),
      {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
    )

    this.breaker.fallback(() => {
      this.logger.warn('Email circuit breaker open — skipping send')
    })
  }

  async sendAccessRequestEmail(params: ISendAccessRequestEmailParams): Promise<void> {
    await this.breaker.fire(params)
  }

  private async send(params: ISendAccessRequestEmailParams): Promise<void> {
    const env = getEnvConfig()

    if (!env.SMTP_HOST) {
      this.logger.warn('SMTP_HOST not configured — skipping email send')
      return
    }

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: `Pulso <${env.SMTP_FROM}>`,
      to: env.ACCESS_REQUEST_TO_EMAIL,
      replyTo: params.email,
      subject: `Solicitação de acesso — ${params.clinicName}`,
      html: this.buildHtml(params),
    })
  }

  private buildHtml(params: ISendAccessRequestEmailParams): string {
    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f2ee">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;background:#ffffff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
              <tr>
                <td style="font-family:sans-serif;padding:40px">
                  <p style="font-weight:700;font-size:18px;margin:0 0 24px;color:#111">Nova solicitação de acesso</p>
                  <p style="margin:0 0 12px;color:#333"><strong>Nome:</strong> ${escapeHtml(params.fullName)}</p>
                  <p style="margin:0 0 12px;color:#333"><strong>E-mail:</strong> ${escapeHtml(params.email)}</p>
                  <p style="margin:0 0 12px;color:#333"><strong>Clínica:</strong> ${escapeHtml(params.clinicName)}</p>
                  ${params.phone ? `<p style="margin:0 0 12px;color:#333"><strong>Telefone:</strong> ${escapeHtml(params.phone)}</p>` : ''}
                  <p style="color:#888;font-size:13px;margin:24px 0 0">Responda este e-mail para falar diretamente com quem solicitou.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
  }
}
