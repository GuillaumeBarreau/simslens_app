#!/bin/bash

# 🚀 Script de Déploiement & Maintenance Docker Automatisé
#
# Usage:
#   ./deployment/deploy.sh [environment|command] [service] [options]
#
# Exemples :
#   ./deployment/deploy.sh                          # Déploiement intelligent : git fetch/pull puis ne rebuild QUE les services modifiés
#   ./deployment/deploy.sh --dry-run                # Affiche ce qui serait redéployé, sans rien faire
#   ./deployment/deploy.sh --all                    # Force le redéploiement complet de tous les services
#   ./deployment/deploy.sh production front         # Redéploie uniquement le front (client)
#   ./deployment/deploy.sh production back          # Redéploie uniquement l'API (server)
#   ./deployment/deploy.sh production discord       # Redéploie uniquement le bot Discord
#   ./deployment/deploy.sh production dashboard     # Redéploie uniquement le dashboard admin
#   ./deployment/deploy.sh production nginx         # Redéploie uniquement le reverse-proxy nginx
#   ./deployment/deploy.sh cleanup                  # Nettoie en profondeur images inutilisées, cache de build et conteneurs arrêtés
#   ./deployment/deploy.sh status                   # Affiche l'état des conteneurs, la RAM consommée et l'espace disque Docker
#
# Options :
#   --all           Ignore la détection des changements et redéploie tous les services
#   --dry-run       Affiche les services qui seraient redéployés puis s'arrête
#   --no-pull       Ne fait pas de `git fetch` / `git pull` (utilise le code local tel quel)
#   --no-cache      Force un rebuild complet sans utiliser le cache des couches Docker
#   --pull          (Conservé pour compatibilité : le pull est désormais automatique)
#   --seed          Exécute le script de seed (`initData.js`) une fois le serveur démarré
#   --skip-backup   Ignore la sauvegarde PostgreSQL avant déploiement
#   --logs          Suit les logs (`docker compose logs -f`) à la fin du déploiement
#
# Détection des changements :
#   Le commit déployé avec succès est mémorisé dans deployment/.last-deployed-commit (ignoré par Git).
#   Au déploiement suivant, les fichiers modifiés entre ce commit et HEAD déterminent les services à rebuild.
#   Si ce fichier n'existe pas encore (premier lancement), tout est redéployé.

set -euo pipefail

# Se placer à la racine du projet
cd "$(dirname "$0")/.."

# Activer BuildKit pour des builds plus rapides, moins gourmands en RAM et un meilleur cache
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
print_step()    { echo -e "\n${CYAN}==>${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

ENVIRONMENT="production"
TARGET_ARG=""
NO_CACHE_FLAG=""
AUTO_PULL=true
FORCE_ALL=false
DRY_RUN=false
RUN_SEED=false
SKIP_BACKUP=false
FOLLOW_LOGS=false
MODE="deploy"

STATE_FILE="deployment/.last-deployed-commit"
# Ordre de build séquentiel (évite 2 builds Vite + tsc en parallèle qui saturent la RAM du VPS)
BUILD_ORDER="server discord client dashboard"

# Analyse des arguments
for arg in "$@"; do
    case "$arg" in
        --no-cache)    NO_CACHE_FLAG="--no-cache" ;;
        --pull)        AUTO_PULL=true ;;
        --no-pull)     AUTO_PULL=false ;;
        --all|--force) FORCE_ALL=true ;;
        --dry-run)     DRY_RUN=true ;;
        --seed)        RUN_SEED=true ;;
        --skip-backup) SKIP_BACKUP=true ;;
        --logs)        FOLLOW_LOGS=true ;;
        cleanup|clean|prune) MODE="cleanup" ;;
        status|stats)        MODE="status" ;;
        production|prod)     ENVIRONMENT="production" ;;
        local|dev)           ENVIRONMENT="local" ;;
        front|frontend|client|app|dashboard|admin|back|backend|server|api|discord|bot|nginx|proxy|postgres|redis)
            TARGET_ARG="$arg"
            ;;
        *)
            print_error "Argument ou service inconnu: '$arg'"
            print_info "Services valides: front (client), dashboard, back (server), discord, nginx"
            print_info "Commandes: cleanup, status | Options: --all, --dry-run, --no-pull, --no-cache, --seed, --skip-backup, --logs"
            exit 1
            ;;
    esac
done

# Résolution du service ciblé
TARGET_SERVICE=""
if [ -n "$TARGET_ARG" ]; then
    case "$TARGET_ARG" in
        front|frontend|client|app) TARGET_SERVICE="client" ;;
        dashboard|admin)           TARGET_SERVICE="dashboard" ;;
        back|backend|server|api)   TARGET_SERVICE="server" ;;
        discord|bot)               TARGET_SERVICE="discord" ;;
        nginx|proxy)               TARGET_SERVICE="nginx" ;;
        postgres|redis)            TARGET_SERVICE="$TARGET_ARG" ;;
    esac
fi

# Sélection du fichier .env selon l'environnement
if [ "$ENVIRONMENT" = "local" ]; then
    ENV_FILE=".env.local"
else
    ENV_FILE=".env"
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé"
    exit 1
fi

DOCKER_COMPOSE_CMD="docker compose --env-file $ENV_FILE"

# Fonction de nettoyage post-build / maintenance
run_docker_cleanup() {
    local deep="${1:-false}"
    print_step "🧹 Nettoyage Docker (images obsolètes, conteneurs arrêtés, cache BuildKit)..."

    # 1. Conteneurs arrêtés
    docker container prune -f >/dev/null 2>&1 || true

    # 2. Images dangling (<none>:<none> générées lors du remplacement d'une image)
    docker image prune -f

    if [ "$deep" = "true" ]; then
        # En mode cleanup explicite : supprime aussi toutes les images non rattachées à un conteneur actif
        docker image prune -a -f
        docker builder prune -a -f
    else
        # En fin de déploiement : conserve les couches récentes (< 72h, max 2 Go) pour accélérer le prochain build
        docker builder prune -f --keep-storage 2GB --filter "until=72h" >/dev/null 2>&1 || \
        docker builder prune -f --filter "until=72h" >/dev/null 2>&1 || true
    fi

    print_info "✅ Nettoyage terminé"
}

show_status_and_memory() {
    print_step "📊 État des conteneurs et consommation RAM"
    if [ -f "$ENV_FILE" ]; then
        $DOCKER_COMPOSE_CMD ps
    else
        docker ps
    fi
    echo ""
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
}

# Ajoute un service à une liste (sans doublon)
add_service() {
    local svc="$1"
    case " $SERVICES_TO_DEPLOY " in
        *" $svc "*) ;;
        *) SERVICES_TO_DEPLOY="$SERVICES_TO_DEPLOY $svc" ;;
    esac
}

has_service() {
    case " $SERVICES_TO_DEPLOY " in
        *" $1 "*) return 0 ;;
        *) return 1 ;;
    esac
}

# Associe chaque fichier modifié au(x) conteneur(s) Docker qui l'embarquent
# (cf. les instructions COPY des Dockerfiles de chaque service)
map_changed_files_to_services() {
    local file
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        case "$file" in
            # Dépendances npm : tous les Dockerfiles copient l'ensemble des package.json du monorepo
            package.json|package-lock.json|*/package.json|.dockerignore)
                for s in $BUILD_ORDER; do add_service "$s"; done ;;
            tsconfig.base.json)
                add_service server; add_service client; add_service dashboard ;;
            tsconfig.web.json)
                add_service client; add_service dashboard ;;
            docker-compose.yml)
                COMPOSE_CHANGED=true ;;
            deployment/nginx/*)
                add_service nginx ;;
            server/src/__tests__/*|server/**/*.test.*|server/**/*.spec.*)
                ;;
            server/*)
                add_service server ;;
            server_discord/*)
                add_service discord ;;
            app_dashboard/*)
                add_service dashboard ;;
            app/src/**/*.test.*|app/src/**/*.spec.*|app/e2e/*)
                ;;
            app/*)
                add_service client ;;
            *)
                # docs, README, scripts, companion, .github… : aucun conteneur concerné
                ;;
        esac
    done
}

# Mode status uniquement
if [ "$MODE" = "status" ]; then
    show_status_and_memory
    print_step "💾 Espace disque Docker"
    docker system df
    exit 0
fi

# Mode cleanup uniquement
if [ "$MODE" = "cleanup" ]; then
    print_step "💾 Espace disque avant nettoyage"
    docker system df
    run_docker_cleanup "true"
    print_step "💾 Espace disque après nettoyage"
    docker system df
    show_status_and_memory
    exit 0
fi

# Vérification du fichier .env pour le déploiement
if [ ! -f "$ENV_FILE" ]; then
    print_error "Fichier $ENV_FILE introuvable!"
    print_info "Copiez .env.production.template vers $ENV_FILE et configurez les valeurs"
    exit 1
fi

print_info "📂 Répertoire : $(pwd)"
print_info "🚀 Environnement : $ENVIRONMENT ($ENV_FILE)"

# ---------------------------------------------------------------------------
# 1. Vérification des mises à jour Git (fetch + pull fast-forward si besoin)
# ---------------------------------------------------------------------------
if [ "$AUTO_PULL" = true ] && git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    print_step "📡 Vérification des mises à jour distantes (git fetch)..."
    git fetch --quiet
    BEHIND=$(git rev-list --count 'HEAD..@{u}')
    if [ "$BEHIND" -gt 0 ]; then
        print_info "📥 $BEHIND nouveau(x) commit(s) disponible(s) :"
        git --no-pager log --oneline 'HEAD..@{u}' | sed 's/^/    /'
        if [ "$DRY_RUN" = false ]; then
            git pull --ff-only --quiet
            print_info "✅ Code mis à jour ($(git rev-parse --short HEAD))"
        fi
    else
        print_info "✅ Le dépôt local est déjà à jour avec la branche distante"
    fi
elif [ "$AUTO_PULL" = true ]; then
    print_warning "Aucune branche distante suivie : git pull ignoré"
fi

# Commit qui sera effectivement déployé (en dry-run on simule l'état après pull)
if [ "$DRY_RUN" = true ] && git rev-parse '@{u}' >/dev/null 2>&1 && [ "$AUTO_PULL" = true ]; then
    TARGET_COMMIT=$(git rev-parse '@{u}')
else
    TARGET_COMMIT=$(git rev-parse HEAD)
fi

# ---------------------------------------------------------------------------
# 2. Détermination des services à redéployer
# ---------------------------------------------------------------------------
SERVICES_TO_DEPLOY=""
COMPOSE_CHANGED=false
FULL_DEPLOY=false
UPDATE_STATE=false

if [ -n "$TARGET_SERVICE" ]; then
    # Service explicitement demandé : on ne touche pas au commit mémorisé
    # (les autres services n'ont peut-être pas encore été redéployés)
    SERVICES_TO_DEPLOY=" $TARGET_SERVICE"
    print_info "🎯 Service ciblé manuellement : $TARGET_SERVICE"
else
    UPDATE_STATE=true
    LAST_COMMIT=""
    [ -f "$STATE_FILE" ] && LAST_COMMIT=$(tr -d '[:space:]' < "$STATE_FILE")

    if [ "$FORCE_ALL" = true ]; then
        FULL_DEPLOY=true
        print_info "📦 --all : redéploiement complet demandé"
    elif [ -z "$LAST_COMMIT" ] || ! git cat-file -e "${LAST_COMMIT}^{commit}" 2>/dev/null; then
        FULL_DEPLOY=true
        print_warning "Aucun commit de référence ($STATE_FILE) : redéploiement complet (premier lancement)"
    else
        print_step "🔍 Analyse des changements depuis le dernier déploiement ($(git rev-parse --short "$LAST_COMMIT") → $(git rev-parse --short "$TARGET_COMMIT"))..."
        CHANGED_FILES=$(git diff --name-only "$LAST_COMMIT" "$TARGET_COMMIT")
        map_changed_files_to_services <<< "$CHANGED_FILES"
        if [ -n "$CHANGED_FILES" ]; then
            echo "$CHANGED_FILES" | sed 's/^/    • /' | head -n 40
            TOTAL=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
            [ "$TOTAL" -gt 40 ] && echo "    … et $((TOTAL - 40)) autre(s) fichier(s)"
        fi
    fi

    if [ "$FULL_DEPLOY" = true ]; then
        SERVICES_TO_DEPLOY=" $BUILD_ORDER"
        COMPOSE_CHANGED=true
    fi
fi

SERVICES_TO_DEPLOY=$(echo "$SERVICES_TO_DEPLOY" | xargs)

if [ -z "$SERVICES_TO_DEPLOY" ] && [ "$COMPOSE_CHANGED" = false ]; then
    print_info "😴 Aucun changement impactant les conteneurs : rien à redéployer."
    if [ "$DRY_RUN" = false ] && [ "$UPDATE_STATE" = true ]; then
        echo "$TARGET_COMMIT" > "$STATE_FILE"
    fi
    exit 0
fi

print_step "🧭 Plan de déploiement"
print_info "Services à rebuild/redémarrer : ${SERVICES_TO_DEPLOY:-aucun}"
[ "$COMPOSE_CHANGED" = true ] && print_info "docker-compose.yml modifié : tous les conteneurs dont la config a changé seront recréés"

if [ "$DRY_RUN" = true ]; then
    print_info "🔎 --dry-run : aucune action effectuée."
    exit 0
fi

# ---------------------------------------------------------------------------
# 3. Sauvegarde PostgreSQL (uniquement si l'API est redéployée)
# ---------------------------------------------------------------------------
if has_service server || [ "$COMPOSE_CHANGED" = true ]; then
    if [ "$SKIP_BACKUP" = false ] && docker ps --format '{{.Names}}' | grep -q "postgres"; then
        print_step "💾 Sauvegarde de la base PostgreSQL (à chaud)..."
        mkdir -p backups
        BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"
        if $DOCKER_COMPOSE_CMD exec -T postgres pg_dump -U "${DB_USER:-postgres}" "${DB_NAME:-droptimizer}" | gzip > "$BACKUP_FILE"; then
            print_info "✅ Sauvegarde compressée créée : $BACKUP_FILE"
            # Rotation : ne garde que les 5 sauvegardes les plus récentes
            ls -1t backups/backup_*.sql* 2>/dev/null | tail -n +6 | xargs -r rm -f
        else
            rm -f "$BACKUP_FILE"
            print_warning "Sauvegarde ignorée (conteneur postgres non disponible)"
        fi
    fi
fi

# ---------------------------------------------------------------------------
# 4. Build séquentiel des seules images concernées
# ---------------------------------------------------------------------------
BUILT_ANY=false
for svc in $BUILD_ORDER; do
    if has_service "$svc"; then
        print_step "🔨 Build de [$svc]..."
        $DOCKER_COMPOSE_CMD build $NO_CACHE_FLAG "$svc"
        BUILT_ANY=true
    fi
done

# ---------------------------------------------------------------------------
# 5. Recréation des conteneurs concernés
# ---------------------------------------------------------------------------
print_step "🔄 Mise à jour des conteneurs..."
if [ "$COMPOSE_CHANGED" = true ]; then
    # Compose ne recrée que les conteneurs dont l'image ou la configuration a changé
    $DOCKER_COMPOSE_CMD up -d --remove-orphans
else
    for svc in $SERVICES_TO_DEPLOY; do
        if [ "$svc" = "nginx" ]; then
            continue
        fi
        $DOCKER_COMPOSE_CMD up -d --no-deps "$svc"
    done
fi

# Nginx : recharge sa config si elle a changé, et rafraîchit son cache DNS interne
# après recréation de client/server/dashboard (sinon il garde les anciennes IP → écran blanc / 502)
if has_service nginx; then
    $DOCKER_COMPOSE_CMD up -d --no-deps --force-recreate nginx
elif [ "$BUILT_ANY" = true ] || [ "$COMPOSE_CHANGED" = true ]; then
    $DOCKER_COMPOSE_CMD restart nginx >/dev/null 2>&1 || true
fi

# Nettoyage APRÈS recréation (c'est maintenant que les anciennes images remplacées sont devenues "dangling")
if [ "$BUILT_ANY" = true ]; then
    run_docker_cleanup "false"
fi

# ---------------------------------------------------------------------------
# 6. Vérification de santé (uniquement si l'API a été redéployée)
# ---------------------------------------------------------------------------
SERVER_HEALTHY=true
if has_service server || [ "$COMPOSE_CHANGED" = true ]; then
    print_step "🩺 Vérification de la santé de l'API..."
    MAX_WAIT=90
    ELAPSED=0
    SERVER_HEALTHY=false
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if $DOCKER_COMPOSE_CMD ps server | grep -q "(healthy)"; then
            SERVER_HEALTHY=true
            break
        fi
        sleep 3
        ELAPSED=$((ELAPSED + 3))
    done
fi

# Seed optionnel si demandé (--seed)
if [ "$RUN_SEED" = true ]; then
    print_step "🌱 Initialisation des données de référence (seed)..."
    $DOCKER_COMPOSE_CMD exec -T server node ./dist/scripts/initData.js
    print_info "✅ Seed terminé"
fi

show_status_and_memory

if [ "$SERVER_HEALTHY" = true ]; then
    # Mémorise le commit déployé pour la prochaine détection des changements
    if [ "$UPDATE_STATE" = true ]; then
        echo "$TARGET_COMMIT" > "$STATE_FILE"
    fi
    print_info "🎉 Déploiement terminé avec succès ! ($(git rev-parse --short "$TARGET_COMMIT") — services : ${SERVICES_TO_DEPLOY:-config compose})"
else
    print_warning "⚠️  Le serveur démarre encore ou nécessite votre attention. Consultez : $DOCKER_COMPOSE_CMD logs --tail=50 server"
    print_warning "Le commit de référence n'a pas été mis à jour : relancez ./deployment/deploy.sh une fois le problème corrigé."
fi

if [ "$FOLLOW_LOGS" = true ]; then
    $DOCKER_COMPOSE_CMD logs -f $SERVICES_TO_DEPLOY
fi
