#!/usr/bin/env bash
set -euo pipefail

# Runs Terraform for a given environment, wiring up the two AWS accounts:
#
#   DevOps   (500905575906) — owns the remote state bucket. profile: pulso-devops
#   Workload (796669927752) — owns the actual infrastructure.  profile: pulso-workload
#
# The DevOps profile authenticates the S3 backend (passed to `init` via -backend-config).
# The Workload profile authenticates the AWS provider (passed to plan/apply via -var).
#
# Usage:
#   bash infra/scripts/deploy.sh <environment> [action]
#
#   environment : staging | production
#   action      : plan (default) | apply | destroy | init | output
#
# Examples:
#   bash infra/scripts/deploy.sh staging              # plan staging
#   bash infra/scripts/deploy.sh staging apply        # apply staging
#   bash infra/scripts/deploy.sh production plan
#   bash infra/scripts/deploy.sh production apply
#
# Override the default profiles with environment variables when needed:
#   DEVOPS_PROFILE=other WORKLOAD_PROFILE=other bash infra/scripts/deploy.sh staging apply

ENVIRONMENT="${1:-}"
ACTION="${2:-plan}"

DEVOPS_PROFILE="${DEVOPS_PROFILE:-pulso-devops}"
WORKLOAD_PROFILE="${WORKLOAD_PROFILE:-pulso-workload}"

DEVOPS_ACCOUNT_ID="500905575906"
WORKLOAD_ACCOUNT_ID="796669927752"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../terraform/environments/$ENVIRONMENT"

usage() {
  echo "Usage: bash infra/scripts/deploy.sh <environment> [action]"
  echo ""
  echo "  environment : staging | production"
  echo "  action      : plan (default) | apply | destroy | init | output"
  echo ""
  echo "Examples:"
  echo "  bash infra/scripts/deploy.sh staging"
  echo "  bash infra/scripts/deploy.sh staging apply"
  echo "  bash infra/scripts/deploy.sh production apply"
  echo ""
  echo "Override profiles with env vars (defaults: pulso-devops / pulso-workload):"
  echo "  DEVOPS_PROFILE=... WORKLOAD_PROFILE=... bash infra/scripts/deploy.sh staging apply"
}

if [[ -z "$ENVIRONMENT" ]]; then
  usage
  exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: environment must be 'staging' or 'production'."
  echo ""
  usage
  exit 1
fi

case "$ACTION" in
  plan|apply|destroy|init|output) ;;
  *)
    echo "Error: unknown action '$ACTION'."
    echo ""
    usage
    exit 1
    ;;
esac

if [[ ! -d "$ENV_DIR" ]]; then
  echo "Error: environment directory not found: $ENV_DIR"
  exit 1
fi

# Verify a profile resolves to the expected AWS account before touching anything.
verify_profile() {
  local profile="$1"
  local expected_account="$2"
  local label="$3"

  local actual_account
  actual_account=$(aws sts get-caller-identity --profile "$profile" --query Account --output text 2>/dev/null || echo "unknown")

  if [[ "$actual_account" != "$expected_account" ]]; then
    echo "Error: $label profile '$profile' resolved to account '$actual_account', expected '$expected_account'."
    echo "Check your AWS credentials/profile (or run 'aws sso login --profile $profile')."
    exit 1
  fi
}

echo "=========================================="
echo " Terraform Deploy"
echo " Environment      : $ENVIRONMENT"
echo " Action           : $ACTION"
echo " DevOps profile   : $DEVOPS_PROFILE (account $DEVOPS_ACCOUNT_ID, state)"
echo " Workload profile : $WORKLOAD_PROFILE (account $WORKLOAD_ACCOUNT_ID, resources)"
echo "=========================================="
echo ""

echo "Verifying AWS profiles..."
verify_profile "$DEVOPS_PROFILE" "$DEVOPS_ACCOUNT_ID" "DevOps"
verify_profile "$WORKLOAD_PROFILE" "$WORKLOAD_ACCOUNT_ID" "Workload"
echo "Profiles OK."
echo ""

cd "$ENV_DIR"

# Always ensure the backend is initialized with the DevOps profile.
echo "Initializing backend..."
terraform init -backend-config="profile=$DEVOPS_PROFILE" -input=false
echo ""

case "$ACTION" in
  init)
    echo "Init complete."
    ;;
  plan)
    terraform plan -var="aws_profile=$WORKLOAD_PROFILE"
    ;;
  apply)
    terraform apply -var="aws_profile=$WORKLOAD_PROFILE"
    ;;
  destroy)
    terraform destroy -var="aws_profile=$WORKLOAD_PROFILE"
    ;;
  output)
    terraform output
    ;;
esac
