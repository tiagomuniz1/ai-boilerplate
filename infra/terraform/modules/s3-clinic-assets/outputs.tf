output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.clinic_assets.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.clinic_assets.arn
}

output "bucket_region" {
  description = "AWS region of the S3 bucket"
  value       = aws_s3_bucket.clinic_assets.region
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for ECS write access"
  value       = aws_iam_policy.clinic_assets_write.arn
}
