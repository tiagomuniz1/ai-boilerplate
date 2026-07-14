locals {
  identifier  = "pulso-${var.environment}"
  ssm_backend = "${var.ssm_prefix}/${var.environment}/backend"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Master password ───────────────────────────────────────────────────────────
# Generated here, never in code/tfvars. Written to SSM SecureString below; the
# value also lives in the Terraform state (S3, DevOps account) — expected.
resource "random_password" "db" {
  length  = 32
  special = true
  # RDS master password forbids /, @, ", and spaces.
  override_special = "!#$%^&*()-_=+[]{}<>:?."
}

# ── Networking ────────────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "this" {
  name       = "${local.identifier}-db"
  subnet_ids = var.subnet_ids
  tags       = local.tags
}

resource "aws_security_group" "rds" {
  name        = "${local.identifier}-rds"
  description = "RDS Postgres for ${var.environment} - 5432 only from the EC2 app SG"
  vpc_id      = var.vpc_id
  tags        = local.tags
}

# Ingress 5432 only from the EC2 app SG (SG reference, not CIDR). Gated by a
# literal bool (not the SG id) so `count` stays known at plan time — the SG id
# itself is computed (known after apply) when wired to module.ec2_app in task 7.
resource "aws_security_group_rule" "rds_ingress_from_ec2" {
  count                    = var.enable_ec2_ingress ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = var.ec2_security_group_id
  description              = "PostgreSQL from EC2 app"
}

resource "aws_security_group_rule" "rds_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.rds.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all egress"
}

# ── Instance ──────────────────────────────────────────────────────────────────
resource "aws_db_instance" "this" {
  identifier     = local.identifier
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result
  port     = 5432

  multi_az               = false
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period    = var.backup_retention_period
  deletion_protection        = var.deletion_protection
  auto_minor_version_upgrade = true
  apply_immediately          = var.apply_immediately

  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${local.identifier}-final-snapshot"

  tags = local.tags
}

# ── SSM parameters consumed by the backend at boot (/pulso/<env>/backend/) ─────
# The RDS module is the single source of truth for the DB connection params, so
# they can never drift from the instance it created.
resource "aws_ssm_parameter" "db_host" {
  name      = "${local.ssm_backend}/DB_HOST"
  type      = "String"
  value     = aws_db_instance.this.address
  overwrite = true
}

resource "aws_ssm_parameter" "db_port" {
  name      = "${local.ssm_backend}/DB_PORT"
  type      = "String"
  value     = tostring(aws_db_instance.this.port)
  overwrite = true
}

resource "aws_ssm_parameter" "db_name" {
  name      = "${local.ssm_backend}/DB_NAME"
  type      = "String"
  value     = var.db_name
  overwrite = true
}

resource "aws_ssm_parameter" "db_user" {
  name      = "${local.ssm_backend}/DB_USER"
  type      = "String"
  value     = var.db_username
  overwrite = true
}

resource "aws_ssm_parameter" "db_pass" {
  name      = "${local.ssm_backend}/DB_PASS"
  type      = "SecureString"
  value     = random_password.db.result
  overwrite = true
}
