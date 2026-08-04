variable "environment" {
  description = "Environment name (production)"
  type        = string

  validation {
    condition     = contains(["production"], var.environment)
    error_message = "Environment must be 'production'."
  }
}

variable "from_email" {
  description = "Sender e-mail address to verify in SES. Used when identity_type = 'email'."
  type        = string
  default     = "noreply@pulso.center"
}

variable "identity_type" {
  description = "SES identity type: 'email' (single address) or 'domain' (entire domain)."
  type        = string
  default     = "email"

  validation {
    condition     = contains(["email", "domain"], var.identity_type)
    error_message = "identity_type must be 'email' or 'domain'."
  }
}

variable "domain" {
  description = "Domain to verify in SES. Required when identity_type = 'domain'."
  type        = string
  default     = ""
}
