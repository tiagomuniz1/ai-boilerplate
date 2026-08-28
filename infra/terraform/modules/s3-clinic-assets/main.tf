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

# The bucket is fully private. Branding assets are streamed by the backend (ECS) — nothing is
# served directly from S3, so ACLs are disabled and all public access is blocked.
resource "aws_s3_bucket_ownership_controls" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "clinic_assets" {
  bucket = aws_s3_bucket.clinic_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  depends_on = [aws_s3_bucket_ownership_controls.clinic_assets]
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

# No public bucket policy. Access is granted exclusively to the ECS backend via the IAM policy
# below; the backend streams objects to clients.

# ── IAM policy for ECS backend ────────────────────────────────────────────────

resource "aws_iam_policy" "clinic_assets_write" {
  name        = "clinic-assets-write-${var.environment}"
  # Kept verbatim on purpose: changing an IAM policy description forces a
  # destroy-and-create, which detaches the policy from the EC2 role for a few
  # seconds and fails every upload in that window. The prefix list below is the
  # real contract; the description is cosmetic and not worth an outage.
  description = "Allows ECS backend to upload and manage clinic assets and exam results in ${local.bucket_name}"

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
        # One entry per prefix the backend writes to. A missing prefix does not
        # fail at deploy — it fails as a 500 the first time a user uploads that
        # kind of file, which is how consultation-photos slipped through.
        Resource = [
          "${aws_s3_bucket.clinic_assets.arn}/clinics/*",
          "${aws_s3_bucket.clinic_assets.arn}/exam-results/*",
          "${aws_s3_bucket.clinic_assets.arn}/consultation-photos/*"
        ]
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
