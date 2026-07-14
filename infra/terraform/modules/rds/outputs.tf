output "db_endpoint" {
  description = "RDS endpoint host (without :port)."
  value       = aws_db_instance.this.address
}

output "db_port" {
  description = "RDS port."
  value       = aws_db_instance.this.port
}

output "sg_id" {
  description = "Security Group of the RDS instance."
  value       = aws_security_group.rds.id
}

# The master password is intentionally NOT exposed as an output — it is written
# straight to SSM SecureString.
