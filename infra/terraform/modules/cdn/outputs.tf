output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (e.g. dxxxx.cloudfront.net) — the alias target of the Route 53 records."
  value       = aws_cloudfront_distribution.this.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id — for cache invalidations from the deploy pipeline."
  value       = aws_cloudfront_distribution.this.id
}

output "acm_certificate_arn" {
  description = "ARN of the validated ACM wildcard certificate."
  value       = aws_acm_certificate_validation.this.certificate_arn
}
