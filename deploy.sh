#!/usr/bin/env bash
set -e

# ==============================================================================
# UPI Offline Mesh - Docker Deployment & Management Script
# ==============================================================================

# Determine Docker compose command (supports 'docker compose' and 'docker-compose')
detect_compose() {
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ Docker or Docker Compose is not installed or not in PATH."
        echo ""
        echo "To install Docker on Ubuntu / Debian:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y docker.io docker-compose-v2"
        echo "  sudo usermod -aG docker \$USER"
        echo "  newgrp docker  # or log out and back in"
        echo ""
        echo "For other platforms, visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ACTION="${1:-start}"

case "$ACTION" in
    start|up)
        detect_compose
        echo "🚀 Building and starting UPI Offline Mesh containers..."
        $COMPOSE_CMD up --build -d
        echo ""
        echo "✨ Application starting up!"
        echo "   - Frontend UI:        http://localhost (or http://localhost:5173)"
        echo "   - Backend REST API:   http://localhost:8080/api/accounts"
        echo "   - H2 Database Console:http://localhost:8080/h2-console"
        echo ""
        echo "Run './deploy.sh status' to monitor healthcheck progress."
        echo "Run './deploy.sh logs' to follow live container logs."
        ;;

    stop|down)
        detect_compose
        echo "🛑 Stopping UPI Offline Mesh containers..."
        $COMPOSE_CMD down
        echo "✅ All containers stopped."
        ;;

    restart)
        detect_compose
        echo "🔄 Restarting UPI Offline Mesh containers..."
        $COMPOSE_CMD restart
        echo "✅ Containers restarted."
        ;;

    logs)
        detect_compose
        echo "📋 Tailing logs (Ctrl+C to exit)..."
        $COMPOSE_CMD logs -f "${2:-}"
        ;;

    status|ps)
        detect_compose
        echo "📊 Container status:"
        $COMPOSE_CMD ps
        ;;

    rebuild)
        detect_compose
        echo "🔨 Clean rebuilding containers without cache..."
        $COMPOSE_CMD build --no-cache
        $COMPOSE_CMD up -d
        echo "✅ Clean rebuild complete."
        ;;

    check)
        echo "🔍 Checking endpoints..."
        echo -n "Frontend (http://localhost): "
        curl -s -o /dev/null -w "%{http_code}\n" http://localhost || echo "Not reachable"
        echo -n "Backend API (http://localhost:8080/api/server-key): "
        curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/server-key || echo "Not reachable"
        ;;

    help|*)
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start       Build and start all containers in detached mode (default)"
        echo "  stop        Stop and tear down running containers"
        echo "  restart     Restart existing containers"
        echo "  logs        Tail logs of all containers (or specify service: ./deploy.sh logs backend)"
        echo "  status      Show status and health of containers"
        echo "  rebuild     Clean rebuild images without cache and restart"
        echo "  check       Quick HTTP check on exposed endpoints"
        echo "  help        Display this help message"
        ;;
esac
