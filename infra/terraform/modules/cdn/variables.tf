variable "environment" {
  description = "Environment name (staging or production)."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "domain" {
  description = "Domain served by the edge. The wildcard *.domain covers api.domain and every clinic subdomain. May be a subdomain of the hosted zone (e.g. staging.pulso.center). Only ONE CloudFront distribution can own these aliases at a time."
  type        = string
  default     = "pulso.center"
}

variable "zone_name" {
  description = "Route 53 hosted zone that holds the records. Usually the registrable apex (pulso.center) even when domain is a subdomain of it (staging.pulso.center)."
  type        = string
  default     = "pulso.center"
}

variable "origin_domain_name" {
  description = "Public DNS of the EC2 origin (output public_dns of the ec2-app module). CloudFront reaches it over HTTP on port 80; the EC2 Security Group restricts 80 to CloudFront."
  type        = string
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_100 keeps costs down (US, Canada, Europe edges)."
  type        = string
  default     = "PriceClass_100"
}

variable "static_path_pattern" {
  description = "Path pattern for cacheable, hashed static assets (Next.js build output)."
  type        = string
  default     = "/_next/static/*"
}
