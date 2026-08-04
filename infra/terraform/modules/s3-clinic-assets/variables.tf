variable "environment" {
  description = "Environment name (production)"
  type        = string

  validation {
    condition     = contains(["production"], var.environment)
    error_message = "Environment must be 'production'."
  }
}

variable "allowed_origins" {
  description = "Allowed origins for CORS on the assets bucket"
  type        = list(string)
}

variable "ecs_task_role_name" {
  description = "Name of the ECS task IAM role to attach write permissions to. Leave empty to skip attachment."
  type        = string
  default     = ""
}
