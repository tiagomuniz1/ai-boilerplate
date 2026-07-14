variable "environment" {
  description = "Environment name (staging or production). The role is assumable only from the matching GitHub Environment."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "github_owner" {
  description = "GitHub org/user that owns the repository."
  type        = string
  default     = "tiagomuniz1"
}

variable "github_repo" {
  description = "GitHub repository name."
  type        = string
  default     = "ai-boilerplate"
}

variable "create_oidc_provider" {
  description = "Whether to create the account-wide GitHub OIDC provider. Only ONE per account: staging creates it, production references it via data source."
  type        = bool
  default     = true
}

variable "ecr_repository_arns" {
  description = "ARNs of the ECR repositories the CI role may push to."
  type        = list(string)
}

variable "ssm_target_instance_arns" {
  description = "EC2 instance ARNs the CI role may target with ssm:SendCommand (the environment's deploy host)."
  type        = list(string)
}
