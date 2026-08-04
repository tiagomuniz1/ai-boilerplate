#!/usr/bin/env bash
set -euo pipefail

# Seeds the first PLATFORM_ADMIN (backoffice manager) into the environment's RDS.
# The platform is closed and seeds never run in production, so the initial admin
# is bootstrapped once with this script. It runs a one-off backend container on
# the EC2 host via SSM Run Command (no SSH), reusing the deployed image + its
# SSM env loading. Idempotent — safe to re-run.
#
# The password is bcrypt-hashed LOCALLY; only the hash is sent (never the plain
# text, so it does not land in SSM command history).
#
# Usage:
#   ADMIN_EMAIL=admin@pulso.center ADMIN_PASSWORD='a-strong-password' \
#     [ADMIN_NAME='Platform Admin'] bash infra/scripts/seed-platform-admin.sh <environment>
#
#   environment : production

ENVIRONMENT="${1:-}"
WORKLOAD_PROFILE="${WORKLOAD_PROFILE:-pulso-workload}"
AWS_REGION="${AWS_REGION:-us-east-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../../apps/backend"
SEED_JS="$BACKEND_DIR/scripts/seed-platform-admin.js"

if [[ "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: ADMIN_EMAIL=.. ADMIN_PASSWORD=.. bash infra/scripts/seed-platform-admin.sh production" >&2
  exit 1
fi
: "${ADMIN_EMAIL:?ADMIN_EMAIL is required}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}"
ADMIN_NAME="${ADMIN_NAME:-Platform Admin}"
[[ -f "$SEED_JS" ]] || { echo "seed script not found: $SEED_JS" >&2; exit 1; }

# ── Hash the password locally (keeps the plain text off the wire / SSM history) ─
HASH=$(cd "$BACKEND_DIR" && ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  node -e "console.log(require('bcrypt').hashSync(process.env.ADMIN_PASSWORD, 10))" 2>/dev/null || true)
if [[ "$HASH" != \$2* ]]; then
  echo "ERROR: could not bcrypt-hash the password locally." >&2
  echo "Run 'yarn install' so apps/backend has bcrypt built for this machine." >&2
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

# ── Pass the admin config via a base64 env-file (no per-value quoting) ─────────
# The seed script itself is baked into the backend image (apps/backend/scripts),
# so it runs by its real path — where Node resolves pg/dotenv from node_modules,
# exactly like migrate.sh runs bootstrap-schema.js. Requires the image to be built
# from a commit that includes seed-platform-admin.js (run a Deploy first).
ENVFILE=$(printf 'AWS_REGION=%s\nPARAMETER_STORE_ENV=%s\nNODE_ENV=production\nDOTENV_CONFIG_PATH=.env.local\nADMIN_EMAIL=%s\nADMIN_NAME=%s\nADMIN_PASSWORD_HASH=%s\n' \
  "$AWS_REGION" "$ENVIRONMENT" "$ADMIN_EMAIL" "$ADMIN_NAME" "$HASH")
ENVFILE_B64=$(printf '%s' "$ENVFILE" | base64 | tr -d '\n')

# ── Remote script: run a one-off backend container that loads SSM env + seeds ──
REMOTE=$(cat <<REMOTE_EOF
set -e
echo ${ENVFILE_B64} | base64 -d > /tmp/seed-admin.env
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY} >/dev/null
docker pull ${ECR_REGISTRY}/pulso-backend:latest >/dev/null
# Attach to the running app's Docker network so the private RDS endpoint resolves
# via the VPC resolver. On the default bridge that lookup can't reach the VPC
# resolver and the DB connection hangs.
NET=\$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}' pulso-backend 2>/dev/null || true)
# --entrypoint sh is required: the image ENTRYPOINT (docker-entrypoint.sh) would
# otherwise ignore our command and boot the backend server (hangs forever).
docker run --rm \${NET:+--network \$NET} --entrypoint sh --env-file /tmp/seed-admin.env ${ECR_REGISTRY}/pulso-backend:latest \
  -c 'node apps/backend/scripts/load-env.js && node -r dotenv/config apps/backend/scripts/seed-platform-admin.js'
rm -f /tmp/seed-admin.env
REMOTE_EOF
)

INPUT=$(jq -n --arg iid "$INSTANCE_ID" --arg script "$REMOTE" \
  '{InstanceIds: [$iid], DocumentName: "AWS-RunShellScript", Comment: "seed platform admin", TimeoutSeconds: 600, Parameters: {commands: [$script], executionTimeout: ["600"]}}')

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
  --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query 'StandardOutputContent' --output text || true

if [[ "$STATUS" != "Success" ]]; then
  echo "--- stderr ---" >&2
  aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --profile "$WORKLOAD_PROFILE" --region "$AWS_REGION" --query 'StandardErrorContent' --output text >&2 || true
  exit 1
fi
echo "Done. Log in at https://backoffice.pulso.center with ${ADMIN_EMAIL}."