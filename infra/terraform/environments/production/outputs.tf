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

# ── ECR / EC2 ─────────────────────────────────────────────────────────────────
# ECR repositories are shared (owned by the staging state); referenced here by name.
output "ecr_registry_url" {
  description = "ECR registry host — used as ECR_REGISTRY by the deploy pipeline and compose."
  value       = local.ecr_registry
}

output "ec2_public_ip" {
  description = "Elastic IP of the EC2 host — CloudFront origin and DNS target."
  value       = module.ec2_app.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance id — target for SSM Run Command deploys."
  value       = module.ec2_app.instance_id
}

output "ec2_security_group_id" {
  description = "Security Group of the EC2 host (source allowed to reach RDS 5432)."
  value       = module.ec2_app.security_group_id
}

# ── CDN ───────────────────────────────────────────────────────────────────────
output "cloudfront_domain_name" {
  description = "CloudFront distribution domain — Route 53 aliases point here."
  value       = module.cdn.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id — for cache invalidations in the deploy pipeline."
  value       = module.cdn.cloudfront_distribution_id
}

output "acm_certificate_arn" {
  description = "ARN of the validated ACM wildcard certificate."
  value       = module.cdn.acm_certificate_arn
}

# ── CI/CD ─────────────────────────────────────────────────────────────────────
output "github_actions_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN variable of the GitHub 'production' Environment."
  value       = module.github_oidc.role_arn
}

# ── SES ───────────────────────────────────────────────────────────────────────
# After apply, copy these values to AWS Parameter Store:
#
#   aws ssm put-parameter --name "/umi/production/SMTP_HOST" \
#     --value "$(terraform output -raw ses_smtp_host)" \
#     --type String --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/production/SMTP_PORT" \
#     --value "587" --type String --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/production/SMTP_USER" \
#     --value "$(terraform output -raw ses_smtp_username)" \
#     --type String --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/production/SMTP_PASS" \
#     --value "$(terraform output -raw ses_smtp_password)" \
#     --type SecureString --overwrite --profile <profile>
#
#   aws ssm put-parameter --name "/umi/production/SMTP_FROM" \
#     --value "noreply@pulso.center" --type String --overwrite --profile <profile>
#
# DNS records required (domain identity):
#   Verification TXT: _amazonses.pulso.center → ses_domain_verification_token
#   DKIM CNAMEs (3):  {token}._domainkey.pulso.center → {token}.dkim.amazonses.com
#   SPF TXT:          pulso.center → "v=spf1 include:amazonses.com ~all"

output "ses_smtp_host" {
  description = "SES SMTP endpoint — add to Parameter Store as /umi/production/SMTP_HOST"
  value       = module.ses_email.smtp_host
}

output "ses_smtp_username" {
  description = "SES SMTP username — add to Parameter Store as /umi/production/SMTP_USER"
  value       = module.ses_email.smtp_username
}

output "ses_smtp_password" {
  description = "SES SMTP password — add to Parameter Store as /umi/production/SMTP_PASS (SecureString). Retrieve with: terraform output -raw ses_smtp_password"
  value       = module.ses_email.smtp_password
  sensitive   = true
}

output "ses_dkim_tokens" {
  description = "DKIM CNAME tokens for DNS. Add each as: {token}._domainkey.pulso.center → {token}.dkim.amazonses.com"
  value       = module.ses_email.dkim_tokens
}

output "ses_domain_verification_token" {
  description = "Domain verification TXT record value. Add as: _amazonses.pulso.center TXT {token}"
  value       = module.ses_email.domain_verification_token
}
