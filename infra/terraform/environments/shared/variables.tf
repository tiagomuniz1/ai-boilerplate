variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile for the Workload account (796669927752). Locally: pulso-workload. Leave empty in CI/CD."
  type        = string
  default     = ""
}
