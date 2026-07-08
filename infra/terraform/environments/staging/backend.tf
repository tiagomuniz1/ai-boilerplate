terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State stored in the DevOps account (500905575906) — profile: pulso-devops
  # Resources are created in the Workload account (796669927752) — profile: pulso-workload
  #
  # Backend auth cannot use Terraform variables — pass the DevOps profile via flag:
  #
  #   terraform init -backend-config="profile=pulso-devops"
  #
  # In CI/CD, set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY for the DevOps account
  # as GitHub Actions secrets and omit the profile.
  backend "s3" {
    bucket       = "terraform-state-500905575906"
    key          = "staging/clinic-assets/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}
