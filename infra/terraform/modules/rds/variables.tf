variable "environment" {
  description = "Environment name (staging | production)."
  type        = string
}

variable "vpc_id" {
  description = "VPC in which to create the RDS subnet group and security group."
  type        = string
}

variable "subnet_ids" {
  description = "Subnets for the DB subnet group (default VPC subnets)."
  type        = list(string)
}

variable "ec2_security_group_id" {
  description = "Security Group of the EC2 app — the only source allowed to reach 5432. Used when enable_ec2_ingress = true."
  type        = string
  default     = ""
}

variable "enable_ec2_ingress" {
  description = "Create the 5432 ingress rule from ec2_security_group_id. Kept as a literal bool so `count` is known at plan time even when the SG id is computed. Set true in task 7."
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "pulso"
}

variable "db_username" {
  description = "Master username."
  type        = string
  default     = "pulso"
}

variable "engine_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "16"
}

variable "instance_class" {
  description = "RDS instance class (free tier: db.t4g.micro)."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB (free tier: 20)."
  type        = number
  default     = 20
}

variable "backup_retention_period" {
  description = "Automated backup retention in days (enables PITR)."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Block accidental deletion of the instance."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on deletion. Keep false in production."
  type        = bool
  default     = false
}

variable "apply_immediately" {
  description = "Apply changes immediately instead of during the maintenance window."
  type        = bool
  default     = false
}

variable "ssm_prefix" {
  description = "SSM Parameter Store prefix. Params land at <prefix>/<environment>/backend/."
  type        = string
  default     = "/pulso"
}
