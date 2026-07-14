variable "environment" {
  description = "Environment name (staging or production)."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "vpc_id" {
  description = "VPC in which to create the instance and security group (default VPC)."
  type        = string
}

variable "subnet_id" {
  description = "Subnet for the instance (a public subnet of the default VPC — it needs an Elastic IP as CloudFront origin)."
  type        = string
}

variable "operator_ip_cidr" {
  description = "CIDR (/32) allowed to SSH on port 22. Leave empty to create NO SSH ingress rule (SSM Session Manager still works)."
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance type (free tier: t3.micro)."
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI to use. Leave empty to resolve the latest Amazon Linux 2023 x86_64 AMI."
  type        = string
  default     = ""
}

variable "ecr_registry" {
  description = "ECR registry host (<account>.dkr.ecr.<region>.amazonaws.com) written into the deploy env file for docker-compose.prod.yml."
  type        = string
}

variable "image_tag" {
  description = "Image tag the compose stack pulls (defaults to latest; the pipeline overrides per deploy)."
  type        = string
  default     = "latest"
}

variable "ecr_repository_arns" {
  description = "ARNs of the ECR repositories the instance may pull. Defaults to all repositories in the account (pull is low-risk within the app's own account)."
  type        = list(string)
  default     = ["*"]
}

variable "s3_iam_policy_arn" {
  description = "ARN of the clinic-assets S3 IAM policy (output of the s3-clinic-assets module) to attach to the instance role. Empty to skip."
  type        = string
  default     = ""
}

variable "ssm_prefix" {
  description = "SSM Parameter Store prefix the instance may read. Scoped to <prefix>/<environment>/*."
  type        = string
  default     = "/pulso"
}

variable "app_repository_url" {
  description = "Git URL cloned by user-data to obtain docker-compose.prod.yml and infra/proxy/nginx.conf. Empty to skip cloning (the pipeline delivers files via SSM instead)."
  type        = string
  default     = ""
}

variable "app_repository_branch" {
  description = "Branch to clone for the compose/proxy files."
  type        = string
  default     = "main"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 20
}

variable "swap_size_mb" {
  description = "Swap file size in MB (safety net for the 1GB t3.micro)."
  type        = number
  default     = 2048
}
