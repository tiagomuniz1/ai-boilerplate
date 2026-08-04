variable "environment" {
  description = "Environment name (production). The role is assumable only from the matching GitHub Environment."
  type        = string

  validation {
    condition     = contains(["production"], var.environment)
    error_message = "Environment must be 'production'."
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
  default     = "pulso"
}

variable "github_owner_id" {
  description = "GitHub numeric (immutable) ID of the owner. GitHub's default OIDC subject claim scopes to this ID instead of the mutable login, so the trust relationship isn't broken by a rename. Fetch via `gh api repos/OWNER/REPO --jq .owner.id`."
  type        = string
  default     = "14317632"
}

variable "github_repo_id" {
  description = "GitHub numeric (immutable) ID of the repository. See github_owner_id. Fetch via `gh api repos/OWNER/REPO --jq .id`."
  type        = string
  default     = "1213836286"
}

variable "ecr_repository_arns" {
  description = "ARNs of the ECR repositories the CI role may push to."
  type        = list(string)
}

variable "ssm_target_instance_arns" {
  description = "EC2 instance ARNs the CI role may target with ssm:SendCommand (the environment's deploy host)."
  type        = list(string)
}
