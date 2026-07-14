output "role_arn" {
  description = "ARN of the CI deploy role — set as the AWS_DEPLOY_ROLE_ARN variable of the matching GitHub Environment."
  value       = aws_iam_role.ci_deploy.arn
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider used by the role."
  value       = local.oidc_provider_arn
}
