variable "environment" {
  description = "Environment name (staging or production)."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "repository_names" {
  description = "ECR repository names. Kept without an environment suffix on purpose: docker-compose.prod.yml references them as <registry>/pulso-backend, <registry>/pulso-frontend and <registry>/pulso-website, and staging/production are distinguished by image tag, sharing the same repositories."
  type        = list(string)
  default     = ["pulso-backend", "pulso-frontend", "pulso-website"]
}

variable "image_retention_count" {
  description = "How many most-recent tagged images to keep per repository."
  type        = number
  default     = 10
}

variable "untagged_expiry_days" {
  description = "Expire untagged images older than this many days."
  type        = number
  default     = 14
}
