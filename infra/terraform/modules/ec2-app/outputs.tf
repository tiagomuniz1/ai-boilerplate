output "public_ip" {
  description = "Elastic IP of the instance — the CloudFront origin and DNS target."
  value       = aws_eip.this.public_ip
}

output "public_dns" {
  description = "Public DNS name of the instance derived from its Elastic IP — used as the CloudFront origin domain (CloudFront cannot use a bare IP). Format assumes us-east-1 (compute-1)."
  value       = "ec2-${replace(aws_eip.this.public_ip, ".", "-")}.compute-1.amazonaws.com"
}

output "security_group_id" {
  description = "Security Group of the instance — consumed by the RDS module to allow 5432."
  value       = aws_security_group.ec2.id
}

output "instance_id" {
  description = "EC2 instance id (for SSM Run Command deploys)."
  value       = aws_instance.this.id
}

output "instance_arn" {
  description = "EC2 instance ARN — scopes the CI deploy role's ssm:SendCommand."
  value       = aws_instance.this.arn
}

output "iam_role_name" {
  description = "Name of the instance IAM role."
  value       = aws_iam_role.ec2.name
}
