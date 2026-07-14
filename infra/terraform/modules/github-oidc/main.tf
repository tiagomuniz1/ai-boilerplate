data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Trust is scoped to the specific GitHub Environment so the staging role can
  # only be assumed by a staging deployment, and production by a production one.
  subject = "repo:${var.github_owner}/${var.github_repo}:environment:${var.environment}"

  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn

  run_shell_document_arn = "arn:aws:ssm:${data.aws_region.current.name}::document/AWS-RunShellScript"
}

# ── GitHub OIDC provider (account-wide, created once by staging) ───────────────
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # GitHub's OIDC thumbprints. AWS validates the token against its own trust store
  # for this provider, but the field is required by the API.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = local.tags
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

# ── CI deploy role ────────────────────────────────────────────────────────────
resource "aws_iam_role" "ci_deploy" {
  name = "pulso-${var.environment}-ci-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "sts:AssumeRoleWithWebIdentity"
        Principal = { Federated = local.oidc_provider_arn }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.subject
          }
        }
      }
    ]
  })

  tags = local.tags
}

# Push images to ECR.
resource "aws_iam_role_policy" "ecr_push" {
  name = "ecr-push"
  role = aws_iam_role.ci_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = var.ecr_repository_arns
      }
    ]
  })
}

# Trigger the deploy on the environment's instance via SSM Run Command, and read
# the result back. DescribeInstances has no resource-level scoping (used to find
# the instance by tag), so it is granted on "*".
resource "aws_iam_role_policy" "ssm_deploy" {
  name = "ssm-deploy"
  role = aws_iam_role.ci_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SendCommand"
        Effect   = "Allow"
        Action   = "ssm:SendCommand"
        Resource = concat(var.ssm_target_instance_arns, [local.run_shell_document_arn])
      },
      {
        Sid    = "ReadCommandResult"
        Effect = "Allow"
        Action = [
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations",
          "ssm:ListCommands"
        ]
        Resource = "*"
      },
      {
        Sid      = "DiscoverInstance"
        Effect   = "Allow"
        Action   = "ec2:DescribeInstances"
        Resource = "*"
      }
    ]
  })
}
