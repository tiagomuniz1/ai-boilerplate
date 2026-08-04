# Account-wide GitHub OIDC provider. Exactly one of these exists per AWS account —
# owned by the `shared` environment so it survives independently of whichever
# per-environment Terraform state (e.g. `production`) is created or destroyed.
#
# Per-environment CI deploy roles (module "github-oidc") look this provider up by
# URL via a data source — they never need this resource's ARN passed in directly.

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # GitHub's OIDC thumbprints. AWS validates the token against its own trust store
  # for this provider, but the field is required by the API.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = {
    ManagedBy = "terraform"
  }
}
