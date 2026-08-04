provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null
}

# Resources that must survive independently of any single environment
# (staging/production) being created or destroyed:
#
#   - ECR repositories: hold every image ever pushed, regardless of which
#     environment's deploy pipeline pushed it.
#   - The account-wide GitHub OIDC provider: exactly one per AWS account: both
#     environments' CI deploy roles trust it (module "github-oidc" in each
#     environment looks it up by URL via a data source).
#
# Neither staging nor production owns these anymore — extracted here so that
# decommissioning an environment (e.g. `deploy.sh staging destroy`) can never
# accidentally take down the container registry or the CI/CD trust root.

module "ecr" {
  source = "../../modules/ecr"

  environment = "shared"
}

module "oidc_provider" {
  source = "../../modules/oidc-provider"
}
