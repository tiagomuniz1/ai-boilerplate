output "arn" {
  description = "ARN of the account-wide GitHub OIDC provider."
  value       = aws_iam_openid_connect_provider.github.arn
}
