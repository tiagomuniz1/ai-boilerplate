#!/usr/bin/env bash
set -euo pipefail

# Creates the Terraform remote state bucket in the DevOps account.
# Must be run once before the first `terraform init`.
#
# Usage:
#   bash infra/scripts/bootstrap.sh <environment> <devops-aws-profile>
#
# Accounts:
#   DevOps   (500905575906) — owns the state bucket (this script)
#   Workload (796669927752) — owns the actual infrastructure (terraform apply)

ENVIRONMENT="${1:-}"
DEVOPS_PROFILE="${2:-}"
DEVOPS_ACCOUNT_ID="500905575906"
BUCKET_NAME="terraform-state-${DEVOPS_ACCOUNT_ID}"
REGION="us-east-1"

if [[ -z "$ENVIRONMENT" || -z "$DEVOPS_PROFILE" ]]; then
  echo "Usage: bash infra/scripts/bootstrap.sh <environment> <devops-aws-profile>"
  echo ""
  echo "  environment      : shared | production"
  echo "  devops-aws-profile: AWS CLI profile with access to the DevOps account (${DEVOPS_ACCOUNT_ID})"
  echo ""
  echo "Example:"
  echo "  bash infra/scripts/bootstrap.sh production devops-profile"
  exit 1
fi

if [[ "$ENVIRONMENT" != "shared" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: environment must be 'shared' or 'production'"
  exit 1
fi

PROFILE_FLAGS="--profile $DEVOPS_PROFILE"

echo "=========================================="
echo " Terraform Bootstrap"
echo " Environment    : $ENVIRONMENT"
echo " DevOps account : $DEVOPS_ACCOUNT_ID"
echo " State bucket   : $BUCKET_NAME"
echo " Region         : $REGION"
echo " AWS profile    : $DEVOPS_PROFILE"
echo "=========================================="
echo ""

# Verify the profile is pointing to the correct account
CALLER_ACCOUNT=$(aws sts get-caller-identity $PROFILE_FLAGS --query Account --output text 2>/dev/null || echo "unknown")
if [[ "$CALLER_ACCOUNT" != "$DEVOPS_ACCOUNT_ID" ]]; then
  echo "Error: profile '$DEVOPS_PROFILE' resolved to account '$CALLER_ACCOUNT', expected '$DEVOPS_ACCOUNT_ID'."
  echo "Check your AWS credentials and profile configuration."
  exit 1
fi

# Check if bucket already exists
if aws s3api head-bucket --bucket "$BUCKET_NAME" $PROFILE_FLAGS 2>/dev/null; then
  # Bucket exists — verify it is in the expected region
  ACTUAL_REGION=$(aws s3api get-bucket-location \
    --bucket "$BUCKET_NAME" \
    $PROFILE_FLAGS \
    --query 'LocationConstraint' \
    --output text)

  # us-east-1 returns "None" from get-bucket-location
  if [[ "$ACTUAL_REGION" == "None" ]]; then
    ACTUAL_REGION="us-east-1"
  fi

  if [[ "$ACTUAL_REGION" != "$REGION" ]]; then
    echo "Error: bucket '$BUCKET_NAME' exists but is in '$ACTUAL_REGION', expected '$REGION'."
    echo ""
    echo "To fix, delete and recreate:"
    echo "  aws s3 rb s3://$BUCKET_NAME --force $PROFILE_FLAGS --region $ACTUAL_REGION"
    echo "  bash infra/scripts/bootstrap.sh $ENVIRONMENT $DEVOPS_PROFILE"
    exit 1
  fi

  echo "Bucket '$BUCKET_NAME' already exists in '$REGION' — skipping creation."
else
  echo "Creating state bucket '$BUCKET_NAME' in '$REGION'..."

  # us-east-1 does not accept LocationConstraint — all other regions require it
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --region "$REGION" \
      $PROFILE_FLAGS
  else
    aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION" \
      $PROFILE_FLAGS
  fi

  echo "Enabling versioning on '$BUCKET_NAME'..."
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled \
    $PROFILE_FLAGS

  echo "Blocking public access on '$BUCKET_NAME'..."
  aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    $PROFILE_FLAGS

  echo ""
  echo "State bucket '$BUCKET_NAME' created successfully in '$REGION'."
fi

echo ""
echo "=========================================="
echo " Next steps:"
echo "=========================================="
echo ""
echo "  cd infra/terraform/environments/$ENVIRONMENT"
echo ""
echo "  # Init — backend auth uses the DevOps profile (state bucket)"
echo "  terraform init -backend-config=\"profile=$DEVOPS_PROFILE\""
echo ""
echo "  # Plan/Apply — provider auth uses the Workload account profile"
echo "  terraform plan  -var=\"aws_profile=<workload-profile>\""
echo "  terraform apply -var=\"aws_profile=<workload-profile>\""
echo ""
