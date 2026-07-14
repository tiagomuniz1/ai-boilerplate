locals {
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Repositories ──────────────────────────────────────────────────────────────
# One repository per image (backend, frontend). CI builds and pushes here; the
# EC2 host only pulls. Scan-on-push surfaces CVEs on every build.

resource "aws_ecr_repository" "this" {
  for_each = toset(var.repository_names)

  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

# ── Lifecycle policy ──────────────────────────────────────────────────────────
# Expire dangling untagged layers, and cap the number of tagged images kept so
# the registry does not grow unbounded across deploys.

resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than ${var.untagged_expiry_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_expiry_days
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only the last ${var.image_retention_count} tagged images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.image_retention_count
        }
        action = { type = "expire" }
      }
    ]
  })
}
