#!/usr/bin/env bash
set -euo pipefail
# Publishes the vaccine catalogue and the national immunisation calendar into the
# environment's RDS.
#
# Seeds never run in production (project rule), but the vaccine module is inert
# without this reference data: no catalogue means nothing to record or indicate,
# and no schedule rules means the vaccine status panel computes nothing. Same
# situation as the medication catalogue and the canonical fields.
#
# Runs a one-off backend container on the EC2 host via SSM Run Command (no SSH),
# reusing the deployed image and its SSM env loading — the same mechanism as
# seed-platform-admin.sh. Idempotent: existing vaccines and rules are left
# untouched, so it is safe to re-run after every deploy that changes the seed.
#
# Requires the image to be built from a commit that includes
# dist/database/seeds/run-import-vaccines.js — i.e. run a Deploy first.
#
# Usage:
#   bash infra/scripts/import-vaccines.sh production

ENVIRONMENT="${1:-}"
WORKLOAD_PROFILE="${WORKLOAD_PROFILE:-pulso-workload}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: bash infra/scripts/import-vaccines.sh production" >&2
  exit 1
fi

# ── Resolve registry + the environment's running instance ──────────────────────
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

ENVFILE=$(printf 'AWS_REGION=%s\nPARAMETER_STORE_ENV=%s\nNODE_ENV=production\nDOTENV_CONFIG_PATH=.env.local\n' \
  "$AWS_REGION" "$ENVIRONMENT")
ENVFILE_B64=$(printf '%s' "$ENVFILE" | base64 | tr -d '\n')

# ── Remote script: one-off backend container that loads SSM env + imports ──────
REMOTE=$(cat <<REMOTE_EOF
set -e
echo ${ENVFILE_B64} | base64 -d > /tmp/import-vaccines.env
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY} >/dev/null
docker pull ${ECR_REGISTRY}/pulso-backend:latest >/dev/null
# Attach to the running app's Docker network so the private RDS endpoint resolves
# via the VPC resolver. On the default bridge that lookup can't reach the VPC
# resolver and the DB connection hangs.
NET=\$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}' pulso-backend 2>/dev/null || true)
# --entrypoint sh is required: the image ENTRYPOINT would otherwise ignore our
# command and boot the backend server (hangs forever).
docker run --rm \${NET:+--network \$NET} --entrypoint sh --env-file /tmp/import-vaccines.env ${ECR_REGISTRY}/pulso-backend:latest \
  -c 'node apps/backend/scripts/load-env.js && node -r dotenv/config apps/backend/dist/database/seeds/run-import-vaccines.js'
rm -f /tmp/import-vaccines.env
REMOTE_EOF
)

INPUT=$(jq -n --arg iid "$INSTANCE_ID" --arg script "$REMOTE" \
  '{InstanceIds: [$iid], DocumentName: "AWS-RunShellScript", Comment: "import vaccine catalogue", TimeoutSeconds: 600, Parameters: {commands: [$script], executionTimeout: ["600"]}}')

CMD_ID=$(aws ssm send-command --cli-input-json "$INPUT" --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query 'Command.CommandId' --output text)
echo "SSM command: $CMD_ID"

STATUS="Pending"
for _ in $(seq 1 40); do
  sleep 6
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query Status --output text 2>/dev/null || echo "Pending")
  case "$STATUS" in Success | Failed | Cancelled | TimedOut) break ;; esac
done
echo "status: $STATUS"

aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" \
  --query '{stdout: StandardOutputContent, stderr: StandardErrorContent}' --output text

[[ "$STATUS" == "Success" ]] || exit 1
