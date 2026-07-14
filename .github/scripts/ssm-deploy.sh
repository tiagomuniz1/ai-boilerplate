#!/usr/bin/env bash
# Deploys the production Docker stack to the environment's EC2 host via SSM Run
# Command — no SSH. Ships docker-compose.prod.yml + nginx.conf (base64), writes
# the deploy env file, then runs `docker compose pull && up -d`. The `migrate`
# service applies migrations before the backend starts (compose depends_on).
#
# Called by .github/workflows/deploy.yml with:
#   ENVIRONMENT = staging | production
#   IMAGE_TAG   = git sha (the tag pushed to ECR)
#   AWS_REGION  = us-east-1 (from the workflow env)
set -euo pipefail

: "${ENVIRONMENT:?ENVIRONMENT is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
AWS_REGION="${AWS_REGION:-us-east-1}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ── Find the environment's running instance (tagged Name=pulso-<env>) ──────────
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=pulso-${ENVIRONMENT}" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "::error::No running EC2 instance tagged Name=pulso-${ENVIRONMENT}"
  exit 1
fi
echo "Target instance: $INSTANCE_ID"

# ── Files to ship (base64 avoids quoting issues inside the remote script) ──────
COMPOSE_B64=$(base64 -w0 docker-compose.prod.yml)
NGINX_B64=$(base64 -w0 infra/proxy/nginx.conf)

# ── Remote script executed on the host by SSM (runs as root) ──────────────────
# Local expansions (${...}) are baked in now; \$ stays literal for the remote shell.
REMOTE=$(cat <<REMOTE_EOF
set -euo pipefail
APP_DIR=/opt/pulso/app
mkdir -p "\$APP_DIR/infra/proxy"
echo '${COMPOSE_B64}' | base64 -d > "\$APP_DIR/docker-compose.prod.yml"
echo '${NGINX_B64}' | base64 -d > "\$APP_DIR/infra/proxy/nginx.conf"
cat > "\$APP_DIR/deploy.env" <<ENV
ECR_REGISTRY=${ECR_REGISTRY}
IMAGE_TAG=${IMAGE_TAG}
AWS_REGION=${AWS_REGION}
PARAMETER_STORE_ENV=${ENVIRONMENT}
ENV
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
cd "\$APP_DIR"
docker compose --env-file deploy.env -f docker-compose.prod.yml pull
docker compose --env-file deploy.env -f docker-compose.prod.yml up -d
docker image prune -f
docker compose --env-file deploy.env -f docker-compose.prod.yml ps
REMOTE_EOF
)

# ── Send the command (cli-input-json avoids the CLI's URL-following on values) ─
INPUT=$(jq -n \
  --arg iid "$INSTANCE_ID" \
  --arg comment "Deploy pulso ${ENVIRONMENT} ${IMAGE_TAG}" \
  --arg script "$REMOTE" \
  '{InstanceIds: [$iid], DocumentName: "AWS-RunShellScript", Comment: $comment, TimeoutSeconds: 600, Parameters: {commands: [$script], executionTimeout: ["1800"]}}')

CMD_ID=$(aws ssm send-command --cli-input-json "$INPUT" --query 'Command.CommandId' --output text)
echo "SSM command: $CMD_ID"

# ── Poll until the command finishes ───────────────────────────────────────────
STATUS="Pending"
for _ in $(seq 1 90); do
  sleep 10
  STATUS=$(aws ssm get-command-invocation \
    --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --query Status --output text 2>/dev/null || echo "Pending")
  echo "status: $STATUS"
  case "$STATUS" in
    Success) break ;;
    Cancelled | TimedOut | Failed) break ;;
  esac
done

echo "----- stdout -----"
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --query StandardOutputContent --output text || true

if [[ "$STATUS" != "Success" ]]; then
  echo "::error::Deploy did not succeed (status: $STATUS)"
  echo "----- stderr -----"
  aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --query StandardErrorContent --output text || true
  exit 1
fi

echo "Deploy succeeded."
