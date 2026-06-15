variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile for the Workload account (796669927752). Locally: umi-homologation. Leave empty in CI/CD."
  type        = string
  default     = ""
}

variable "ecs_task_role_name" {
  description = "Name of the ECS task IAM role to attach S3 write permissions to. Leave empty to skip."
  type        = string
  default     = ""
}

variable "frontend_url" {
  description = "Production frontend URL for CORS allowed origins"
  type        = string
}
