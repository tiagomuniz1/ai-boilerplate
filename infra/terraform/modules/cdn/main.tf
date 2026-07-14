# NOTE: ACM certificates used by CloudFront MUST live in us-east-1. The staging
# and production environments already run their default provider in us-east-1, so
# this module uses that provider directly. If an environment ever moves to another
# region, pass a us-east-1 aliased provider to this module for the ACM resources.

locals {
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  wildcard = "*.${var.domain}"
}

# ── Hosted zone (already delegated from GoDaddy — never recreated) ─────────────
# The zone is the registrable apex; records for a subdomain served domain (e.g.
# staging.pulso.center) still live in the pulso.center zone.
data "aws_route53_zone" "this" {
  name         = var.zone_name
  private_zone = false
}

# ── Managed CloudFront policies ───────────────────────────────────────────────
# CachingDisabled: authenticated/default traffic is never cached (would break auth).
# CachingOptimized: hashed static assets are safe to cache and shared across tenants.
# AllViewer: forwards Host + Origin + Authorization + all cookies/query strings to
# the origin — the EC2 proxy and middleware route by the original Host.
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

# ── ACM wildcard certificate (us-east-1) ──────────────────────────────────────
resource "aws_acm_certificate" "this" {
  domain_name               = local.wildcard
  subject_alternative_names = [var.domain]
  validation_method         = "DNS"

  tags = local.tags

  lifecycle {
    create_before_destroy = true
  }
}

# The wildcard and the apex share a single validation record, so allow_overwrite
# lets the two domain_validation_options resolve to the same Route 53 record.
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

# ── CloudFront distribution ───────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = var.price_class
  comment         = "Pulso ${var.environment} edge"
  aliases         = [local.wildcard, var.domain]

  origin {
    origin_id   = "ec2-origin"
    domain_name = var.origin_domain_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # TLS terminates at CloudFront; EC2 has no cert
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: dynamic app + API. Nothing cached; everything forwarded to the origin.
  default_cache_behavior {
    target_origin_id       = "ec2-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  # Hashed Next.js static assets: safe to cache long-term (filename carries the hash).
  ordered_cache_behavior {
    path_pattern           = var.static_path_pattern
    target_origin_id       = "ec2-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_optimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.this.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = local.tags
}

# ── Route 53 alias records → CloudFront ────────────────────────────────────────
# Wildcard covers api.<domain> and every <clinic>.<domain>; apex serves the landing.
resource "aws_route53_record" "wildcard" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = local.wildcard
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}
