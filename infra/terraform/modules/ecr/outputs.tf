output "repository_urls" {
  description = "Map of repository name to its full registry URL (ECR_REGISTRY/name)."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "repository_arns" {
  description = "ARNs of the repositories — used to scope the EC2 instance pull policy."
  value       = [for repo in aws_ecr_repository.this : repo.arn]
}

output "registry_url" {
  description = "The registry host (ECR_REGISTRY), shared by all repositories in the account/region."
  value       = split("/", values(aws_ecr_repository.this)[0].repository_url)[0]
}
