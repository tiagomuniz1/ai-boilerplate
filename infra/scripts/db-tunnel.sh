#!/usr/bin/env bash
set -euo pipefail

# Opens an SSM port-forwarding tunnel from this machine to the environment's RDS,
# so a local client (DBeaver, psql) can reach a database that lives in a private
# subnet — no SSH, no bastion, and without opening the security group.
#
# The tunnel hops through the app's EC2 instance, which already has the SSM agent
# and network reach to RDS. Credentials come from the same Parameter Store path
# the backend reads at boot, so they never drift from what the app uses.
#
# Requires the Session Manager plugin:
#   https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
#   macOS: brew install --cask session-manager-plugin
#
# Usage:
#   bash infra/scripts/db-tunnel.sh production [local-port]
#
#   environment : production
#   local-port  : defaults to 5433 (5432 is usually taken by a local Postgres)

ENVIRONMENT="${1:-}"
LOCAL_PORT="${2:-5433}"
WORKLOAD_PROFILE="${WORKLOAD_PROFILE:-pulso-workload}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: bash infra/scripts/db-tunnel.sh production [local-port]" >&2
  exit 1
fi

command -v session-manager-plugin >/dev/null 2>&1 || {
  echo "ERROR: session-manager-plugin not found — aws ssm start-session needs it." >&2
  echo "  macOS: brew install --cask session-manager-plugin" >&2
  exit 1
}

if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: local port $LOCAL_PORT is already in use — pass another one:" >&2
  echo "  bash infra/scripts/db-tunnel.sh $ENVIRONMENT 5434" >&2
  exit 1
fi

PREFIX="/pulso/${ENVIRONMENT}/backend"

param() {
  aws ssm get-parameter --name "${PREFIX}/$1" ${2:+--with-decryption} \
    --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" \
    --query 'Parameter.Value' --output text
}

echo "==> [$ENVIRONMENT] Reading connection settings from ${PREFIX}..."
DB_HOST=$(param DB_HOST)
DB_PORT=$(param DB_PORT)
DB_NAME=$(param DB_NAME)
DB_USER=$(param DB_USER)
DB_SCHEMA=$(param DB_SCHEMA || echo public)
DB_PASS=$(param DB_PASS decrypt)

echo "==> [$ENVIRONMENT] Finding the running app instance..."
INSTANCE_ID=$(aws ec2 describe-instances --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=pulso-${ENVIRONMENT}" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "ERROR: no running instance tagged Name=pulso-${ENVIRONMENT}" >&2
  exit 1
fi

cat <<INFO

  Environment : $ENVIRONMENT
  Instance    : $INSTANCE_ID
  RDS host    : $DB_HOST:$DB_PORT

  DBeaver / psql connection:
    Host      : localhost
    Port      : $LOCAL_PORT
    Database  : $DB_NAME
    User      : $DB_USER
    Password  : $DB_PASS
    Schema    : $DB_SCHEMA
    SSL       : require

  psql:
    PGPASSWORD='$DB_PASS' psql -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME

  In DBeaver, set the schema under "PostgreSQL > Show all databases" or point the
  search_path at "$DB_SCHEMA" — the app's tables do not live in public.

  Press Ctrl+C to close the tunnel.

INFO

aws ssm start-session \
  --target "$INSTANCE_ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"${DB_HOST}\"],\"portNumber\":[\"${DB_PORT}\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}" \
  --profile "$WORKLOAD_PROFILE" \
  --region "$AWS_REGION"
