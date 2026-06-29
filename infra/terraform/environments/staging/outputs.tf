output "bucket_name" {
  description = "Name of the clinic assets S3 bucket — add to Parameter Store as AWS_S3_BUCKET"
  value       = module.clinic_assets.bucket_name
}

output "bucket_region" {
  description = "Region of the S3 bucket — add to Parameter Store as AWS_REGION"
  value       = module.clinic_assets.bucket_region
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for ECS write access — attach to ECS task role if not done via ecs_task_role_name variable"
  value       = module.clinic_assets.iam_policy_arn
}

# ── SES ───────────────────────────────────────────────────────────────────────
# After apply, copy these values to AWS Parameter Store:
#
#   aws ssm put-parameter --name "/umi/staging/SMTP_HOST" \
#     --value "$(terraform output -raw ses_smtp_host)" \
#     --type String --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/staging/SMTP_PORT" \
#     --value "587" --type String --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/staging/SMTP_USER" \
#     --value "$(terraform output -raw ses_smtp_username)" \
#     --type String --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/staging/SMTP_PASS" \
#     --value "$(terraform output -raw ses_smtp_password)" \
#     --type SecureString --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/staging/SMTP_FROM" \
#     --value "noreply@pulso.center" --type String --overwrite --profile <profile>

output "ses_smtp_host" {
  description = "SES SMTP endpoint — add to Parameter Store as /umi/staging/SMTP_HOST"
  value       = module.ses_email.smtp_host
}

output "ses_smtp_username" {
  description = "SES SMTP username — add to Parameter Store as /umi/staging/SMTP_USER"
  value       = module.ses_email.smtp_username
}

output "ses_smtp_password" {
  description = "SES SMTP password — add to Parameter Store as /umi/staging/SMTP_PASS (SecureString). Retrieve with: terraform output -raw ses_smtp_password"
  value       = module.ses_email.smtp_password
  sensitive   = true
}

output "ses_dkim_tokens" {
  description = "DKIM CNAME tokens for DNS — not applicable for email identity (staging uses email identity)"
  value       = module.ses_email.dkim_tokens
}
