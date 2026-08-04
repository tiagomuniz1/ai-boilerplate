output "ecr_registry_url" {
  description = "ECR registry host — used as ECR_REGISTRY by the deploy pipeline and compose."
  value       = module.ecr.registry_url
}

output "ecr_repository_urls" {
  description = "Map of image name to full ECR repository URL."
  value       = module.ecr.repository_urls
}

output "oidc_provider_arn" {
  description = "ARN of the account-wide GitHub OIDC provider."
  value       = module.oidc_provider.arn
}
