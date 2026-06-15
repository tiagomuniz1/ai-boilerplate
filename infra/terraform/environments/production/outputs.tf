output "bucket_name" {
  description = "Name of the clinic assets S3 bucket — add to Parameter Store as AWS_S3_BUCKET"
  value       = module.clinic_assets.bucket_name
}

output "bucket_region" {
  description = "Region of the S3 bucket — add to Parameter Store as AWS_REGION"
  value       = module.clinic_assets.bucket_region
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for ECS write access — attach to ECS task role if not done via ecs_task_role_name variable"
  value       = module.clinic_assets.iam_policy_arn
}
