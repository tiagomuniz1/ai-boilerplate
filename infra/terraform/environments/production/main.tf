provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null
}

module "clinic_assets" {
  source = "../../modules/s3-clinic-assets"

  environment        = "production"
  allowed_origins    = [var.frontend_url]
  ecs_task_role_name = var.ecs_task_role_name
}

module "ses_email" {
  source = "../../modules/ses-email"

  environment   = "production"
  identity_type = var.ses_identity_type
  from_email    = var.ses_from_email
  domain        = var.ses_domain
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

# The ECR repositories are shared and owned by the staging environment (same
# account/region). Production references them by their well-known names, built
# from account + region so there is no cross-state ordering dependency.
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  ecr_registry         = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
  ecr_repository_names = ["pulso-backend", "pulso-frontend"]
  ecr_repository_arns = [
    for name in local.ecr_repository_names :
    "arn:aws:ecr:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:repository/${name}"
  ]
}

module "ec2_app" {
  source = "../../modules/ec2-app"

  environment      = "production"
  vpc_id           = data.aws_vpc.default.id
  subnet_id        = data.aws_subnets.default.ids[0]
  operator_ip_cidr = var.operator_ip_cidr

  ecr_registry        = local.ecr_registry
  ecr_repository_arns = local.ecr_repository_arns
  s3_iam_policy_arn   = module.clinic_assets.iam_policy_arn

  app_repository_url = var.app_repository_url
}

module "rds" {
  source = "../../modules/rds"

  environment = "production"
  vpc_id      = data.aws_vpc.default.id
  subnet_ids  = data.aws_subnets.default.ids

  # RDS accepts 5432 only from the EC2 app Security Group.
  enable_ec2_ingress    = true
  ec2_security_group_id = module.ec2_app.security_group_id

  # Production: deletion protection on, final snapshot on (module defaults).
  apply_immediately = false
}

# ACM wildcard (us-east-1) + CloudFront + Route 53 for pulso.center.
# NOTE: only ONE distribution can hold the *.pulso.center aliases at a time — this
# and the staging cdn module are mutually exclusive on the same domain. Apply this
# only once production becomes the live environment (staging cdn destroyed first),
# or point it at a distinct domain via var.domain.
module "cdn" {
  source = "../../modules/cdn"

  environment        = "production"
  domain             = var.domain
  zone_name          = var.dns_zone_name
  origin_domain_name = module.ec2_app.public_dns
}

# CI/CD deploy role for GitHub Actions. The account-wide OIDC provider is created
# by staging; production references it.
module "github_oidc" {
  source = "../../modules/github-oidc"

  environment              = "production"
  create_oidc_provider     = false
  ecr_repository_arns      = local.ecr_repository_arns
  ssm_target_instance_arns = [module.ec2_app.instance_arn]
}
