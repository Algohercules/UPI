#!/usr/bin/env bash
set -e

# ==============================================================================
# UPI Offline Mesh - Docker Deployment & Management Script
# ==============================================================================

# Ensure docker daemon can be accessed
ensure_docker_access() {
    # Check if docker command exists
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed or not in PATH."
        echo ""
        echo "To install Docker on Ubuntu / Debian:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y docker.io docker-compose-v2"
        echo "  sudo usermod -aG docker \$USER"
        echo "  newgrp docker"
        echo ""
        exit 1
    fi

    # If docker daemon is directly accessible, continue
    if docker info &> /dev/null; then
        return 0
    fi

    # Check if permission denied on docker.sock but user is in docker group
    if id -nG "$USER" 2>/dev/null | grep -qw docker || grep -E "^docker:.*(\b|,)$USER(\b|,|$)" /etc/group &> /dev/null; then
        if command -v sg &> /dev/null && [ -z "$DEPLOY_SG_ACTIVE" ]; then
            export DEPLOY_SG_ACTIVE=1
            exec sg docker -c "$0 $*"
        fi
    fi

    # If still not accessible, check if sudo is available
    if command -v sudo &> /dev/null && [ "$EUID" -ne 0 ]; then
        echo "⚠️  Docker daemon socket requires elevated permissions."
        echo "   Running with sudo..."
        exec sudo env "PATH=$PATH" "$0" "$@"
    fi

    echo "❌ Cannot connect to Docker daemon at unix:///var/run/docker.sock."
    echo "   Ensure the docker service is active (sudo systemctl start docker)"
    echo "   or run: newgrp docker"
    exit 1
}

# Determine Docker compose command
detect_compose() {
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null && docker-compose version &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ Docker Compose is not installed or not in PATH."
        echo "To install on Ubuntu / Debian: sudo apt-get install -y docker-compose-v2"
        exit 1
    fi
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ensure_docker_access "$@"
detect_compose

ACTION="${1:-start}"

case "$ACTION" in
    start|up)
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
        echo "🛑 Stopping UPI Offline Mesh containers..."
        $COMPOSE_CMD down
        echo "✅ All containers stopped."
        ;;

    restart)
        echo "🔄 Restarting UPI Offline Mesh containers..."
        $COMPOSE_CMD restart
        echo "✅ Containers restarted."
        ;;

    logs)
        echo "📋 Tailing logs (Ctrl+C to exit)..."
        $COMPOSE_CMD logs -f "${2:-}"
        ;;

    status|ps)
        echo "📊 Container status:"
        $COMPOSE_CMD ps
        ;;

    rebuild)
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
