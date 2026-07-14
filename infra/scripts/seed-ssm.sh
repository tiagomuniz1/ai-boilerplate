#!/usr/bin/env bash
set -euo pipefail

# Seeds the AWS SSM Parameter Store with the backend runtime configuration for a
# given environment, under the prefix consumed by apps/backend/scripts/load-env.js:
#
#   /pulso/<environment>/backend/<KEY>
#
# DB_HOST, DB_PORT, DB_USER, DB_NAME and DB_PASS are intentionally NOT written
# here — they are produced and written by the RDS Terraform module (single source
# of truth for the DB connection). This script only seeds the values the app needs
# that are not owned by another module (DB_SCHEMA, JWT, Redis, SES, etc.).
#
# Secrets (JWT_SECRET, SMTP_PASS) are read from environment variables and stored
# as SecureString — they are NEVER hardcoded in this file. The script prints only
# parameter NAMES, never values.
#
# Usage:
#   JWT_SECRET=... [SMTP_PASS=...] [AWS_S3_BUCKET=...] [SMTP_HOST=...] [SMTP_USER=...] \
#     bash infra/scripts/seed-ssm.sh <environment> [apply]
#
#   environment : staging | production | development
#   apply       : without it, runs in dry-run (prints the put-parameter calls)
#
# Examples:
#   JWT_SECRET=$(openssl rand -base64 48) bash infra/scripts/seed-ssm.sh staging       # dry-run
#   JWT_SECRET=$(openssl rand -base64 48) bash infra/scripts/seed-ssm.sh staging apply  # write

ENVIRONMENT="${1:-}"
ACTION="${2:-dry-run}"

WORKLOAD_PROFILE="${WORKLOAD_PROFILE:-pulso-workload}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "development" ]]; then
  echo "ERROR: environment must be one of: staging | production | development" >&2
  echo "Usage: bash infra/scripts/seed-ssm.sh <environment> [apply]" >&2
  exit 1
fi

PREFIX="/pulso/${ENVIRONMENT}/backend"

# ── Non-secret values (String). Overridable via env vars. ────────────────────
# NOTE: DB_HOST, DB_PORT, DB_USER, DB_NAME and DB_PASS are owned by the RDS
# Terraform module (single source of truth) — NOT seeded here. Only DB_SCHEMA
# (a schema, not an RDS concept) is set here.
DB_SCHEMA="${DB_SCHEMA:-$ENVIRONMENT}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
JWT_EXPIRATION="${JWT_EXPIRATION:-900s}"
JWT_REFRESH_EXPIRATION="${JWT_REFRESH_EXPIRATION:-7d}"

# Domain-derived values. Staging runs under staging.pulso.center; production and
# other envs under pulso.center. Override BASE_DOMAIN to change all three at once.
if [[ "$ENVIRONMENT" == "staging" ]]; then
  BASE_DOMAIN="${BASE_DOMAIN:-staging.pulso.center}"
else
  BASE_DOMAIN="${BASE_DOMAIN:-pulso.center}"
fi
COOKIE_DOMAIN="${COOKIE_DOMAIN:-.${BASE_DOMAIN}}"
PUBLIC_API_URL="${PUBLIC_API_URL:-https://api.${BASE_DOMAIN}}"
FRONTEND_URL="${FRONTEND_URL:-https://backoffice.${BASE_DOMAIN}}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_FROM="${SMTP_FROM:-noreply@pulso.center}"
AWS_REGION_PARAM="${AWS_REGION}"

# Optional (from Terraform outputs of other modules) — seeded only if provided.
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
SMTP_HOST="${SMTP_HOST:-}"
SMTP_USER="${SMTP_USER:-}"

# ── Secrets (SecureString) — must come from the environment. ─────────────────
JWT_SECRET="${JWT_SECRET:-}"
SMTP_PASS="${SMTP_PASS:-}"

if [[ -z "$JWT_SECRET" ]]; then
  echo "ERROR: JWT_SECRET is required (export it before running)." >&2
  echo "  e.g. JWT_SECRET=\$(openssl rand -base64 48) bash infra/scripts/seed-ssm.sh $ENVIRONMENT apply" >&2
  exit 1
fi

put() {
  local name="$1" value="$2" type="$3"
  if [[ -z "$value" ]]; then
    echo "  skip  ${PREFIX}/${name} (no value provided)"
    return
  fi
  if [[ "$ACTION" == "apply" ]]; then
    # Build the request as JSON via jq so values are passed inside --cli-input-json.
    # This avoids the AWS CLI's cli_follow_urlparam behaviour, which would otherwise
    # try to FETCH any --value starting with http(s):// or file:// (e.g. PUBLIC_API_URL).
    local input
    input=$(jq -n \
      --arg name "${PREFIX}/${name}" \
      --arg value "$value" \
      --arg type "$type" \
      '{Name: $name, Value: $value, Type: $type, Overwrite: true}')
    aws ssm put-parameter \
      --cli-input-json "$input" \
      --profile "$WORKLOAD_PROFILE" \
      --region "$AWS_REGION" \
      --output text --query 'Version' >/dev/null
    echo "  set   ${PREFIX}/${name} (${type})"
  else
    echo "  DRY   ${PREFIX}/${name} (${type})"
  fi
}

echo "Seeding SSM under ${PREFIX} (profile=${WORKLOAD_PROFILE}, region=${AWS_REGION}, action=${ACTION})"
echo "NOTE: DB_HOST/DB_PORT/DB_USER/DB_NAME/DB_PASS are written by the RDS module — not here."
echo ""

# String
put DB_SCHEMA              "$DB_SCHEMA"              String
put REDIS_HOST             "$REDIS_HOST"             String
put REDIS_PORT             "$REDIS_PORT"             String
put JWT_EXPIRATION         "$JWT_EXPIRATION"         String
put JWT_REFRESH_EXPIRATION "$JWT_REFRESH_EXPIRATION" String
put COOKIE_DOMAIN          "$COOKIE_DOMAIN"          String
put PUBLIC_API_URL         "$PUBLIC_API_URL"         String
put FRONTEND_URL           "$FRONTEND_URL"           String
put AWS_REGION             "$AWS_REGION_PARAM"       String
put SMTP_PORT              "$SMTP_PORT"              String
put SMTP_FROM              "$SMTP_FROM"              String
put AWS_S3_BUCKET          "$AWS_S3_BUCKET"          String
put SMTP_HOST              "$SMTP_HOST"              String
put SMTP_USER              "$SMTP_USER"              String

# SecureString
put JWT_SECRET             "$JWT_SECRET"             SecureString
put SMTP_PASS              "$SMTP_PASS"              SecureString

echo ""
if [[ "$ACTION" == "apply" ]]; then
  echo "Done. Verify: aws ssm get-parameters-by-path --path ${PREFIX} --recursive --profile ${WORKLOAD_PROFILE} --region ${AWS_REGION} --query 'Parameters[].Name'"
else
  echo "Dry-run only. Re-run with 'apply' as the 2nd argument to write."
fi
