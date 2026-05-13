#!/bin/bash

# SailingLoc Docker Health Check Script

echo "🔍 Vérification de l'état des services Docker..."

# Vérifier si Docker est installé et fonctionne
if ! docker --version &> /dev/null; then
    echo "❌ Docker n'est pas installé ou n'est pas accessible"
    exit 1
fi

# Vérifier si docker-compose est disponible
if ! docker-compose --version &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo "✅ Docker et Docker Compose sont installés"

# Vérifier si les services sont en cours d'exécution
echo ""
echo "📊 État des services :"

# Fonction pour vérifier l'état d'un service
check_service() {
    local service=$1
    local port=$2
    local url=$3

    if curl -s --max-time 5 "$url" > /dev/null; then
        echo "✅ $service : $url (port $port)"
    else
        echo "❌ $service : $url (port $port) - Service non accessible"
    fi
}

# Vérifier les services de développement
check_service "Frontend (dev)" "5173" "http://localhost:5173"
check_service "Backend (API)" "4000" "http://localhost:4000/health"
check_service "PostgreSQL" "5433" "http://localhost:5433" # Note: curl ne fonctionne pas directement sur postgres

# Vérifier les containers Docker
echo ""
echo "🐳 État des containers Docker :"
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    docker-compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ Aucun container en cours d'exécution"
    echo "💡 Lancez 'make dev' pour démarrer les services"
fi

echo ""
echo "📝 Commandes utiles :"
echo "  make dev        - Démarrer en développement"
echo "  make logs       - Voir les logs"
echo "  make dev-down   - Arrêter les services"
echo "  make clean      - Nettoyer tout"