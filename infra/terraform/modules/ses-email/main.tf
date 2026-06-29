data "aws_region" "current" {}

locals {
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── SES Identity ──────────────────────────────────────────────────────────────
# Email identity: single address verification (sufficient for staging).
# Domain identity: verifies the entire domain, enabling any @domain sender (production).

resource "aws_ses_email_identity" "email" {
  count = var.identity_type == "email" ? 1 : 0

  email = var.from_email
}

resource "aws_ses_domain_identity" "domain" {
  count = var.identity_type == "domain" ? 1 : 0

  domain = var.domain
}

# ── DKIM (domain identity only) ───────────────────────────────────────────────
# Generates 3 CNAME tokens that must be added to the domain's DNS.
# Format: {token}._domainkey.{domain} → {token}.dkim.amazonses.com

resource "aws_ses_domain_dkim" "email" {
  count = var.identity_type == "domain" ? 1 : 0

  domain = aws_ses_domain_identity.domain[0].domain
}

# ── IAM user for SMTP ─────────────────────────────────────────────────────────
# Nodemailer authenticates via SMTP credentials (username + password).
# SMTP credentials cannot be derived from a role — a dedicated IAM user is required.
# To remove this limitation in the future, migrate the adapter to @aws-sdk/client-ses.

resource "aws_iam_user" "ses_smtp" {
  name = "ses-smtp-${var.environment}"
  path = "/ses/"

  tags = local.tags
}

resource "aws_iam_policy" "ses_send" {
  name        = "ses-send-${var.environment}"
  description = "Allows sending e-mails via SES from the ${var.environment} environment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowSESSend"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_user_policy_attachment" "ses_smtp" {
  user       = aws_iam_user.ses_smtp.name
  policy_arn = aws_iam_policy.ses_send.arn
}

resource "aws_iam_access_key" "ses_smtp" {
  user = aws_iam_user.ses_smtp.name
}
