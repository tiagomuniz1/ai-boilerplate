provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null
}

module "clinic_assets" {
  source = "../../modules/s3-clinic-assets"

  environment        = "staging"
  allowed_origins    = ["*"]
  ecs_task_role_name = var.ecs_task_role_name
}

module "ses_email" {
  source = "../../modules/ses-email"

  environment   = "staging"
  identity_type = "email"
  from_email    = var.ses_from_email
}

# EC2 and RDS share the default VPC of the Workload account.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Staging owns the shared ECR repositories (pulso-backend / pulso-frontend). The
# names have no environment suffix so docker-compose.prod.yml resolves them the
# same way in every environment; production reads them via a data source.
module "ecr" {
  source = "../../modules/ecr"

  environment = "staging"
}

module "ec2_app" {
  source = "../../modules/ec2-app"

  environment      = "staging"
  vpc_id           = data.aws_vpc.default.id
  subnet_id        = data.aws_subnets.default.ids[0]
  operator_ip_cidr = var.operator_ip_cidr

  # Pinned to the AMI currently running (2026-07-27) so `most_recent` drift no
  # longer forces an instance replacement as a side effect of unrelated applies.
  # Bump deliberately via PR when a new AMI is actually needed.
  ami_id = "ami-00adf8f2fe708c532"

  ecr_registry        = module.ecr.registry_url
  ecr_repository_arns = module.ecr.repository_arns
  s3_iam_policy_arn   = module.clinic_assets.iam_policy_arn

  app_repository_url = var.app_repository_url
}

module "rds" {
  source = "../../modules/rds"

  environment = "staging"
  vpc_id      = data.aws_vpc.default.id
  subnet_ids  = data.aws_subnets.default.ids

  # RDS accepts 5432 only from the EC2 app Security Group.
  enable_ec2_ingress    = true
  ec2_security_group_id = module.ec2_app.security_group_id

  # Staging data is disposable — no final snapshot, deletion allowed, fast applies.
  apply_immediately   = true
  deletion_protection = false
  skip_final_snapshot = true
}

# Staging owns the pulso.center edge (single CloudFront can hold *.pulso.center).
# ACM wildcard (us-east-1) + CloudFront in front of the EC2 origin + Route 53
# records on the already-delegated zone.
module "cdn" {
  source = "../../modules/cdn"

  environment        = "staging"
  domain             = var.domain
  zone_name          = var.dns_zone_name
  origin_domain_name = module.ec2_app.public_dns
}

# CI/CD deploy role assumed by GitHub Actions via OIDC. Staging owns the
# account-wide GitHub OIDC provider; production references it.
module "github_oidc" {
  source = "../../modules/github-oidc"

  environment              = "staging"
  create_oidc_provider     = true
  ecr_repository_arns      = module.ecr.repository_arns
  ssm_target_instance_arns = [module.ec2_app.instance_arn]
}
