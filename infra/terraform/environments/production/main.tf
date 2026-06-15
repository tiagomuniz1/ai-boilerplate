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
