output "smtp_username" {
  description = "SMTP username (IAM access key ID) — save to Parameter Store as SMTP_USER"
  value       = aws_iam_access_key.ses_smtp.id
}

output "smtp_password" {
  description = "SMTP password derived from the IAM secret key — save to Parameter Store as SMTP_PASS. Sensitive."
  value       = aws_iam_access_key.ses_smtp.ses_smtp_password_v4
  sensitive   = true
}

output "smtp_host" {
  description = "SES SMTP endpoint — save to Parameter Store as SMTP_HOST"
  value       = "email-smtp.${data.aws_region.current.name}.amazonaws.com"
}

output "dkim_tokens" {
  description = "DKIM tokens to add as CNAME records in DNS: {token}._domainkey.{domain} → {token}.dkim.amazonses.com. Applicable only for domain identity."
  value       = try(aws_ses_domain_dkim.email[0].dkim_tokens, [])
}

output "domain_verification_token" {
  description = "TXT record value for domain verification. Applicable only for domain identity. Add as: _amazonses.{domain} TXT {token}"
  value       = try(aws_ses_domain_identity.domain[0].verification_token, "")
}
