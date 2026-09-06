#!/usr/bin/env bash
# Bootstraps a fresh Ubuntu/Debian VPS: installs Docker + Compose plugin,
# configures a minimal firewall, and starts the full stack.
#
# Run as: sudo ./scripts/bootstrap-vps.sh
#
# Idempotent — safe to re-run if it fails partway through (e.g. Docker
# installs fine but you haven't filled in .env yet).

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root (sudo ./scripts/bootstrap-vps.sh)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Step 1/5: Installing Docker (skipped if already installed)"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
else
  echo "    Docker already installed, skipping."
fi

echo "==> Step 2/5: Enabling Docker to start on boot"
systemctl enable docker
systemctl start docker

echo "==> Step 3/5: Configuring firewall (ufw) — allow SSH, HTTP, HTTPS only"
if command -v ufw &> /dev/null; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  # --force skips the interactive "are you sure" prompt — safe here since
  # we've just explicitly allowed SSH above, so this won't lock you out.
  ufw --force enable
else
  echo "    ufw not found — skipping firewall setup. Configure one manually,"
  echo "    or install ufw first: apt-get install ufw"
fi

echo "==> Step 4/5: Checking for .env"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo ""
  echo "    Created .env from .env.example — IT STILL HAS PLACEHOLDER VALUES."
  echo "    Edit it now, then re-run this script:"
  echo "      nano $REPO_DIR/.env"
  echo ""
  exit 0
fi

if grep -q "REPLACE_ME\|change-me-to-something\|your-web-client-id\|example.com" .env; then
  echo ""
  echo "    .env still contains placeholder values. Edit it before continuing:"
  echo "      nano $REPO_DIR/.env"
  echo ""
  exit 1
fi

echo "==> Step 5/5: Building and starting the stack"
docker compose up -d --build

echo ""
echo "==> Done. Checking service health in 15 seconds..."
sleep 15
docker compose ps

echo ""
echo "If everything shows healthy above, your API should now respond at:"
echo "  https://\$(grep API_DOMAIN .env | cut -d= -f2)/health"
echo ""
echo "Useful next commands:"
echo "  ./scripts/manage.sh logs        — tail all logs"
echo "  ./scripts/manage.sh status      — check container health"
echo "  ./scripts/backup-db.sh          — take a database backup"
