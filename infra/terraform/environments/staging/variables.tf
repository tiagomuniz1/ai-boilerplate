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

variable "ecs_task_role_name" {
  description = "Name of the ECS task IAM role to attach S3 write permissions to. Leave empty to skip."
  type        = string
  default     = ""
}

variable "ses_from_email" {
  description = "Sender e-mail address to verify in SES for staging (email identity)."
  type        = string
  default     = "noreply@pulso.center"
}

variable "operator_ip_cidr" {
  description = "CIDR (/32) allowed to SSH into the EC2 host. Empty (default) creates no SSH rule — use SSM Session Manager instead."
  type        = string
  default     = ""
}

variable "app_repository_url" {
  description = "Git URL cloned by EC2 user-data for docker-compose.prod.yml + nginx.conf. Empty (default) defers file delivery to the deploy pipeline (task 9) via SSM."
  type        = string
  default     = ""
}

variable "domain" {
  description = "Domain served by the staging edge (CloudFront aliases *.domain + domain). Staging runs under staging.pulso.center; pulso.center is reserved for production."
  type        = string
  default     = "staging.pulso.center"
}

variable "dns_zone_name" {
  description = "Route 53 hosted zone holding the records (the registrable apex)."
  type        = string
  default     = "pulso.center"
}
