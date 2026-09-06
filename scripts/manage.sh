#!/usr/bin/env bash
# Day-to-day operations for the deployed stack. Run from the repo root:
#   ./scripts/manage.sh <command>

set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

cmd="${1:-}"

case "$cmd" in
  status)
    docker compose ps
    ;;

  logs)
    service="${2:-}"
    if [[ -z "$service" ]]; then
      docker compose logs -f --tail=100
    else
      docker compose logs -f --tail=100 "$service"
    fi
    ;;

  restart)
    service="${2:-}"
    if [[ -z "$service" ]]; then
      docker compose restart
    else
      docker compose restart "$service"
    fi
    ;;

  update)
    echo "==> Pulling latest code (if this is a git checkout)"
    git pull --ff-only 2>/dev/null || echo "    (not a git repo, or nothing to pull — skipping)"
    echo "==> Rebuilding and restarting changed services"
    docker compose up -d --build
    ;;

  down)
    echo "This stops all containers but keeps your data (postgres/redis volumes)."
    read -p "Continue? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker compose down
    fi
    ;;

  shell)
    service="${2:-backend}"
    docker compose exec "$service" /bin/bash || docker compose exec "$service" /bin/sh
    ;;

  db-shell)
    docker compose exec postgres psql -U "$(grep POSTGRES_USER .env | cut -d= -f2)" -d "$(grep POSTGRES_DB .env | cut -d= -f2)"
    ;;

  *)
    echo "Usage: ./scripts/manage.sh <command>"
    echo ""
    echo "Commands:"
    echo "  status              Show container status and health"
    echo "  logs [service]      Tail logs (all services, or one: backend/web/caddy/postgres/redis)"
    echo "  restart [service]   Restart all services, or one"
    echo "  update              Pull latest code and rebuild/restart"
    echo "  down                Stop all containers (data is preserved)"
    echo "  shell [service]     Open a shell inside a running container (default: backend)"
    echo "  db-shell            Open a psql shell against the live database"
    exit 1
    ;;
esac
