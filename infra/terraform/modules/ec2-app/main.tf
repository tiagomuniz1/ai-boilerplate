data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Default AWS-managed KMS key for SSM SecureString — needed to decrypt DB_PASS/JWT_SECRET.
data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

# CloudFront's origin-facing IP ranges as a managed prefix list — the only source
# allowed to reach port 80. Keeps the origin off the public internet.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# Latest Amazon Linux 2023 x86_64, used when ami_id is not pinned.
data "aws_ami" "al2023" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

locals {
  identifier = "pulso-${var.environment}"
  ami_id     = var.ami_id != "" ? var.ami_id : data.aws_ami.al2023[0].id
  ssm_arn    = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}/${var.environment}/*"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Security Group ────────────────────────────────────────────────────────────
# Ingress 80 only from CloudFront; ingress 22 only from the operator IP (optional).
resource "aws_security_group" "ec2" {
  name        = "${local.identifier}-ec2"
  description = "EC2 app for ${var.environment} - 80 from CloudFront only, 22 from operator only"
  vpc_id      = var.vpc_id
  tags        = local.tags
}

resource "aws_security_group_rule" "http_from_cloudfront" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  security_group_id = aws_security_group.ec2.id
  prefix_list_ids   = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  description       = "HTTP from CloudFront origin-facing ranges"
}

resource "aws_security_group_rule" "ssh_from_operator" {
  count             = var.operator_ip_cidr != "" ? 1 : 0
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  security_group_id = aws_security_group.ec2.id
  cidr_blocks       = [var.operator_ip_cidr]
  description       = "SSH from operator IP"
}

resource "aws_security_group_rule" "egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.ec2.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all egress"
}

# ── IAM role / instance profile ───────────────────────────────────────────────
resource "aws_iam_role" "ec2" {
  name = "${local.identifier}-ec2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "sts:AssumeRole"
        Principal = { Service = "ec2.amazonaws.com" }
      }
    ]
  })

  tags = local.tags
}

# Read backend runtime config from SSM (scoped to this env) + decrypt SecureString.
resource "aws_iam_role_policy" "ssm_read" {
  name = "ssm-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadPulsoParams"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = local.ssm_arn
      },
      {
        Sid      = "DecryptSecureString"
        Effect   = "Allow"
        Action   = "kms:Decrypt"
        Resource = data.aws_kms_alias.ssm.target_key_arn
      }
    ]
  })
}

# Pull images from ECR.
resource "aws_iam_role_policy" "ecr_pull" {
  name = "ecr-pull"
  role = aws_iam_role.ec2.id

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
        Sid    = "EcrPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = var.ecr_repository_arns
      }
    ]
  })
}

# Send e-mail via SES (backend notifications).
resource "aws_iam_role_policy" "ses_send" {
  name = "ses-send"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowSESSend"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })
}

# Managed core policy for SSM Session Manager + Run Command (used by the deploy pipeline).
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Clinic-assets S3 write policy (exported by the s3-clinic-assets module), optional.
resource "aws_iam_role_policy_attachment" "s3_clinic_assets" {
  count      = var.attach_s3_iam_policy ? 1 : 0
  role       = aws_iam_role.ec2.name
  policy_arn = var.s3_iam_policy_arn
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.identifier}-ec2"
  role = aws_iam_role.ec2.name
}

# ── Instance ──────────────────────────────────────────────────────────────────
resource "aws_instance" "this" {
  ami                    = local.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    environment    = var.environment
    aws_region     = data.aws_region.current.name
    ecr_registry   = var.ecr_registry
    image_tag      = var.image_tag
    swap_size_mb   = var.swap_size_mb
    repository_url = var.app_repository_url
    repository_ref = var.app_repository_branch
  })

  # Re-provision the instance if the bootstrap script changes.
  user_data_replace_on_change = true

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    encrypted             = true
    delete_on_termination = true
  }

  tags = merge(local.tags, { Name = local.identifier })
}

# ── Elastic IP ────────────────────────────────────────────────────────────────
# Stable origin address for CloudFront / DNS; survives stop/start.
resource "aws_eip" "this" {
  domain   = "vpc"
  instance = aws_instance.this.id
  tags     = merge(local.tags, { Name = local.identifier })
}
