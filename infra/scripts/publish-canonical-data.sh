#!/usr/bin/env bash
set -euo pipefail

# Publishes the canonical platform data into the environment's RDS, via a one-off
# backend container on the EC2 host (SSM Run Command — no SSH):
#   themes           — the platform theme catalogue (fast)
#   canonical-fields — the medical-record canonical field catalogue (fast)
#   medications      — the ANVISA open-data base (~36k rows, downloaded on the host)
# All imports are idempotent (upsert), so it is safe to re-run.
#
# Usage:
#   bash infra/scripts/publish-canonical-data.sh <environment> [dataset]
#     environment : staging | production
#     dataset     : all (default) | themes | canonical-fields | medications

ENVIRONMENT="${1:-}"
DATASET="${2:-all}"
WORKLOAD_PROFILE="${WORKLOAD_PROFILE:-pulso-workload}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: bash infra/scripts/publish-canonical-data.sh <staging|production> [all|themes|canonical-fields|medications]" >&2
  exit 1
fi

case "$DATASET" in
  all)
    SEED_STEPS='node apps/backend/dist/database/seeds/run-import-themes.js && node apps/backend/dist/database/seeds/run-import-canonical-fields.js && node apps/backend/dist/database/seeds/run-import-medications.js' ;;
  themes)
    SEED_STEPS='node apps/backend/dist/database/seeds/run-import-themes.js' ;;
  canonical-fields)
    SEED_STEPS='node apps/backend/dist/database/seeds/run-import-canonical-fields.js' ;;
  medications)
    SEED_STEPS='node apps/backend/dist/database/seeds/run-import-medications.js' ;;
  *)
    echo "Unknown dataset '$DATASET'. Use: all | themes | canonical-fields | medications" >&2
    exit 1 ;;
esac

ACCOUNT_ID=$(aws sts get-caller-identity --profile "$WORKLOAD_PROFILE" --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

INSTANCE_ID=$(aws ec2 describe-instances --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=pulso-${ENVIRONMENT}" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "No running instance tagged Name=pulso-${ENVIRONMENT}" >&2
  exit 1
fi
echo "Target instance: $INSTANCE_ID"

# Runs the compiled seed runners inside the deployed image. --entrypoint sh is
# required (the image ENTRYPOINT would boot the server); attach to the app network
# so the private RDS endpoint resolves; env from SSM via load-env.js at boot.
REMOTE=$(cat <<REMOTE_EOF
set -e
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY} >/dev/null
docker pull ${ECR_REGISTRY}/pulso-backend:latest >/dev/null
NET=\$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}' pulso-backend 2>/dev/null || true)
docker run --rm \${NET:+--network \$NET} \
  -e AWS_REGION=${AWS_REGION} -e PARAMETER_STORE_ENV=${ENVIRONMENT} -e NODE_ENV=production \
  --entrypoint sh ${ECR_REGISTRY}/pulso-backend:latest \
  -c 'node apps/backend/scripts/load-env.js && ${SEED_STEPS}'
REMOTE_EOF
)

INPUT=$(jq -n --arg iid "$INSTANCE_ID" --arg script "$REMOTE" \
  '{InstanceIds: [$iid], DocumentName: "AWS-RunShellScript", Comment: "publish canonical data", TimeoutSeconds: 600, Parameters: {commands: [$script], executionTimeout: ["1800"]}}')

CMD_ID=$(aws ssm send-command --cli-input-json "$INPUT" --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query 'Command.CommandId' --output text)
echo "SSM command: $CMD_ID"

# The medications import downloads + upserts ~36k rows, so allow several minutes.
STATUS="Pending"
for _ in $(seq 1 80); do
  sleep 15
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query Status --output text 2>/dev/null || echo "Pending")
  echo "status: $STATUS"
  case "$STATUS" in Success | Failed | Cancelled | TimedOut) break ;; esac
done

echo "----- output (tail) -----"
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query 'StandardOutputContent' --output text | tail -20 || true

if [[ "$STATUS" != "Success" ]]; then
  echo "----- stderr -----" >&2
  aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query 'StandardErrorContent' --output text | tail -20 >&2 || true
  exit 1
fi
echo "Done. Canonical data (${DATASET}) published to ${ENVIRONMENT}."
