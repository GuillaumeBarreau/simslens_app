# 🚀 Script de Déploiement & Maintenance Docker Automatisé (PowerShell)
# Usage:
#   .\deployment\deploy.ps1 [production|local|cleanup|status] [service] [-NoCache] [-Pull] [-Seed] [-SkipBackup] [-Logs]

param(
    [string]$Environment = "production",
    [string]$Service = "",
    [switch]$NoCache,
    [switch]$Pull,
    [switch]$Seed,
    [switch]$SkipBackup,
    [switch]$Logs
)

$ErrorActionPreference = "Stop"

$ScriptRoot = $PSScriptRoot
Set-Location "$ScriptRoot/.."

$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

function Print-Info([string]$Message)    { Write-Host "[INFO] $Message" -ForegroundColor Green }
function Print-Step([string]$Message)    { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Print-Warning([string]$Message) { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Print-Error([string]$Message)   { Write-Host "[ERROR] $Message" -ForegroundColor Red }

$EnvFile = if ($Environment -eq "local") { ".env.local" } else { ".env" }

if ($Environment -in @("cleanup", "clean", "prune")) {
    Print-Step "🧹 Nettoyage complet Docker..."
    docker system df
    docker container prune -f
    docker image prune -a -f
    docker builder prune -a -f
    docker system df
    exit 0
}

if ($Environment -in @("status", "stats")) {
    Print-Step "📊 État des conteneurs et consommation RAM"
    docker compose --env-file $EnvFile ps
    docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}"
    docker system df
    exit 0
}

if (-not (Test-Path $EnvFile)) {
    Print-Error "Fichier $EnvFile introuvable!"
    exit 1
}

$TargetService = switch ($Service) {
    { $_ -in "front", "frontend", "client", "app" } { "client" }
    { $_ -in "dashboard", "admin" }                 { "dashboard" }
    { $_ -in "back", "backend", "server", "api" }   { "server" }
    { $_ -in "discord", "bot" }                     { "discord" }
    { $_ -in "nginx", "proxy" }                     { "nginx" }
    default { $Service }
}

if ($Pull) {
    Print-Step "📥 Mise à jour Git..."
    git pull --ff-only
}

$NoCacheArgs = if ($NoCache) { @("--no-cache") } else { @() }

# Build séquentiel pour économiser la RAM
Print-Step "🔨 Build des images Docker..."
if ($TargetService) {
    docker compose --env-file $EnvFile build @NoCacheArgs $TargetService
} else {
    foreach ($svc in @("server", "discord", "client", "dashboard")) {
        Print-Info "Build séquentiel de [$svc]..."
        docker compose --env-file $EnvFile build @NoCacheArgs $svc
    }
}

Print-Step "🔄 Démarrage / mise à jour des conteneurs..."
if ($TargetService) {
    docker compose --env-file $EnvFile up -d --no-deps --remove-orphans $TargetService
} else {
    docker compose --env-file $EnvFile up -d --remove-orphans
}

Print-Step "🧹 Nettoyage des anciennes images et du cache de build..."
docker container prune -f | Out-Null
docker image prune -f | Out-Null
docker builder prune -f --filter "until=72h" | Out-Null

if ($Seed) {
    Print-Step "🌱 Seeding de la base de données..."
    docker compose --env-file $EnvFile exec -T server node ./dist/scripts/initData.js
}

Print-Step "📊 État des services et RAM"
docker compose --env-file $EnvFile ps
docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}"

if ($Logs) {
    docker compose --env-file $EnvFile logs -f $TargetService
}
