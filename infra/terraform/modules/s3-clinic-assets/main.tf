locals {
  bucket_name = "clinic-assets-${var.environment}"
}

# ── Bucket ────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "clinic_assets" {
  bucket = local.bucket_name

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Disable versioning — logos are overwritten in-place, no history needed.
# Lifecycle rule below covers the case where versioning is enabled in the future.
resource "aws_s3_bucket_versioning" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  depends_on = [aws_s3_bucket_versioning.clinic_assets]
}

# ── Public access ─────────────────────────────────────────────────────────────

# AWS changed the default to BucketOwnerEnforced (ACLs disabled) in Apr 2023.
# Set to BucketOwnerPreferred to allow per-object public-read ACLs.
resource "aws_s3_bucket_ownership_controls" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  depends_on = [aws_s3_bucket_ownership_controls.clinic_assets]
}

resource "aws_s3_bucket_acl" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id
  acl    = "public-read"

  depends_on = [aws_s3_bucket_public_access_block.clinic_assets]
}

# ── CORS ──────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket_cors_configuration" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = var.allowed_origins
    max_age_seconds = 3600
  }
}

# ── Bucket policy ─────────────────────────────────────────────────────────────

resource "aws_s3_bucket_policy" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadClinicAssets"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.clinic_assets.arn}/clinics/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.clinic_assets]
}

# ── IAM policy for ECS backend ────────────────────────────────────────────────

resource "aws_iam_policy" "clinic_assets_write" {
  name        = "clinic-assets-write-${var.environment}"
  description = "Allows ECS backend to upload and manage clinic assets in ${local.bucket_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ClinicAssetsReadWrite"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.clinic_assets.arn}/clinics/*"
      }
    ]
  })
}

# Attach only when an ECS task role is provided — skip in initial provisioning
# if the ECS infrastructure hasn't been created yet.
resource "aws_iam_role_policy_attachment" "clinic_assets_write" {
  count = var.ecs_task_role_name != "" ? 1 : 0

  role       = var.ecs_task_role_name
  policy_arn = aws_iam_policy.clinic_assets_write.arn
}
