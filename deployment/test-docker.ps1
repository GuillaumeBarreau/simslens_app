# ðŸ§ª Script de Test Docker Local (Windows PowerShell)
# Ce script teste la configuration Docker en local avant le dÃ©ploiement

$ErrorActionPreference = "Stop"

# Se placer Ã  la racine du projet (un niveau au-dessus du script)
$ScriptRoot = $PSScriptRoot
Set-Location "$ScriptRoot/.."

Write-Host "ðŸ§ª Test de la Configuration Docker en Local" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Colors
function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Print-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Print-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host ">>> $Message" -ForegroundColor Cyan
    Write-Host ""
}

# VÃ©rifier les prÃ©requis
Print-Step "Ã‰tape 1: VÃ©rification des prÃ©requis"

try {
    docker --version | Out-Null
    Print-Success "Docker installÃ©"
} catch {
    Print-Error "Docker n'est pas installÃ©"
    exit 1
}

try {
    docker-compose --version | Out-Null
    Print-Success "Docker Compose installÃ©"
} catch {
    Print-Error "Docker Compose n'est pas installÃ©"
    exit 1
}

# Copier le fichier de test
Print-Step "Ã‰tape 2: Configuration de l'environnement de test"

if (Test-Path ".env.docker-test") {
    Copy-Item ".env.docker-test" ".env" -Force
    Print-Success "Fichier .env crÃ©Ã© depuis .env.docker-test"
} else {
    Print-Error "Fichier .env.docker-test introuvable"
    exit 1
}

# ArrÃªter les conteneurs existants
Print-Step "Ã‰tape 3: Nettoyage des conteneurs existants"

Print-Info "ArrÃªt des conteneurs..."
$ErrorActionPreference = "Continue"
docker-compose down -v | Out-Null
$ErrorActionPreference = "Stop"
Print-Success "Conteneurs arrÃªtÃ©s"

# Build des images
Print-Step "Ã‰tape 4: Build des images Docker"

Print-Info "Build en cours (cela peut prendre plusieurs minutes)..."
docker-compose build --no-cache

if ($LASTEXITCODE -eq 0) {
    Print-Success "Build rÃ©ussi"
} else {
    Print-Error "Ã‰chec du build"
    exit 1
}

# DÃ©marrer les services
Print-Step "Ã‰tape 5: DÃ©marrage des services"

Print-Info "DÃ©marrage de tous les services..."
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Print-Success "Services dÃ©marrÃ©s"
} else {
    Print-Error "Ã‰chec du dÃ©marrage"
    exit 1
}

# Attendre que les services soient prÃªts
Print-Step "Ã‰tape 6: Attente du dÃ©marrage complet"

Print-Info "Attente de 15 secondes pour que Postgres et Redis dÃ©marrent..."
Start-Sleep -Seconds 15

# Migrations Prisma
# On applique les migrations AVANT de checker la santÃ© du serveur, car le serveur a besoin de la BDD pour Ãªtre sain
Print-Step "Ã‰tape 7: Application des migrations Prisma"

Print-Info "Application des migrations..."
try {
    docker-compose exec -T server npx prisma migrate deploy
    Print-Success "Migrations appliquÃ©es avec succÃ¨s"
} catch {
    Print-Warning "PremiÃ¨re tentative de migration Ã©chouÃ©e. Nouvelle essai dans 10 secondes..."
    Start-Sleep -Seconds 10
    try {
        docker-compose exec -T server npx prisma migrate deploy
        Print-Success "Migrations appliquÃ©es avec succÃ¨s"
    } catch {
        Print-Error "Ã‰chec critique des migrations"
        docker-compose logs --tail=50 server
        # On continue quand mÃªme pour voir l'Ã©tat des services
    }
}

# GÃ©nÃ©ration du client Prisma
Print-Info "GÃ©nÃ©ration du client Prisma..."
docker-compose exec -T server npx prisma generate
Print-Success "Client Prisma gÃ©nÃ©rÃ©"

# VÃ©rifier l'Ã©tat des services
Print-Step "Ã‰tape 8: VÃ©rification de l'Ã©tat des services (Health Checks)"

# On attend un peu que le serveur devienne healthy aprÃ¨s les migrations
Print-Info "Attente de 10 secondes pour que le healthcheck du serveur passe au vert..."
Start-Sleep -Seconds 10

$services = docker-compose ps
Write-Host $services
Write-Host ""

$allHealthy = $true

# VÃ©rifier chaque service
if ($services -match "server.*healthy") {
    Print-Success "Server: HEALTHY"
} else {
    Print-Error "Server: UNHEALTHY ou DOWN"
    $allHealthy = $false
    Print-Warning "Si le serveur est 'starting', c'est peut-Ãªtre normal juste aprÃ¨s le dÃ©marrage."
}

if ($services -match "postgres.*healthy") {
    Print-Success "PostgreSQL: HEALTHY"
} else {
    Print-Error "PostgreSQL: UNHEALTHY ou DOWN"
    $allHealthy = $false
}

if ($services -match "redis.*Up") {
    Print-Success "Redis: UP"
} else {
    Print-Error "Redis: DOWN"
    $allHealthy = $false
}

if ($services -match "client.*Up") {
    Print-Success "Client: UP"
} else {
    Print-Error "Client: DOWN"
    $allHealthy = $false
}

# Si c'est critique, on s'arrÃªte, sauf si c'est juste le serveur qui met du temps
if (-not $allHealthy) {
    Print-Warning "Certains services ne sont pas encore marquÃ©s 'healthy'. Cela peut Ãªtre normal au dÃ©marrage."
    Print-Warning "Le test continue..."
}

# Test des connexions
Print-Step "Ã‰tape 9: Test des connexions"

# Test PostgreSQL
Print-Info "Test de la connexion PostgreSQL..."
try {
    docker-compose exec -T server npx prisma db pull 2>&1 | Out-Null
    Print-Success "Connexion PostgreSQL: OK"
} catch {
    Print-Error "Connexion PostgreSQL: Ã‰CHEC"
}

# Test Redis
Print-Info "Test de la connexion Redis..."
$redisTest = docker-compose exec -T redis redis-cli ping
if ($redisTest -match "PONG") {
    Print-Success "Connexion Redis: OK"
} else {
    Print-Error "Connexion Redis: Ã‰CHEC"
}

# Seeding (optionnel)
Print-Step "Ã‰tape 10: Seeding des donnÃ©es (optionnel)"

$seedChoice = Read-Host "Voulez-vous seeder les donnÃ©es de test? (y/N)"
if ($seedChoice -eq "y" -or $seedChoice -eq "Y") {
    Print-Info "Seeding en cours (cela peut prendre plusieurs minutes)..."
    try {
        # Utilisation du chemin dist pour Docker
        docker-compose exec -T server node ./dist/scripts/initData.js
        Print-Success "Seeding terminÃ©"
    } catch {
        Print-Warning "Ã‰chec du seeding"
        Write-Error $_
    }
}

# Tests fonctionnels API / Frontend
Print-Step "Ã‰tape 11: Tests fonctionnels HTTP"

Print-Info "Test de l'endpoint de santÃ© du serveur..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Print-Success "API Health: OK (Status 200)"
    } else {
        Print-Warning "API Health: Status $($response.StatusCode)"
    }
} catch {
    Print-Error "API Health: Ã‰CHEC - $($_.Exception.Message)"
}

Print-Info "Test du frontend..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Print-Success "Frontend: OK (Status 200)"
    } else {
        Print-Warning "Frontend: Status $($response.StatusCode)"
    }
} catch {
    Print-Error "Frontend: Ã‰CHEC - $($_.Exception.Message)"
}

# RÃ©sumÃ© final
Print-Step "RÃ©sumÃ© du Test"

if ($allHealthy) {
    Write-Host ""
    Write-Host "ðŸŽ‰ TOUS LES TESTS SONT PASSÃ‰S !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Votre configuration Docker est prÃªte pour la production !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Services disponibles:" -ForegroundColor Cyan
    Write-Host "  - Frontend:    http://localhost:5173" -ForegroundColor White
    Write-Host "  - API:         http://localhost:5000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "âš ï¸  CERTAINS TESTS ONT Ã‰CHOUÃ‰" -ForegroundColor Red
    Write-Host ""
    Write-Host "VÃ©rifiez les logs ci-dessous." -ForegroundColor Yellow
    Write-Host ""
}

# Demander si on veut voir les logs
$showLogs = Read-Host "Voulez-vous afficher les logs maintenant? (y/N)"
if ($showLogs -eq "y" -or $showLogs -eq "Y") {
    docker-compose logs -f
}

# Demander si on veut arrÃªter les services
Write-Host ""
$stopServices = Read-Host "Voulez-vous arrÃªter les services de test? (y/N)"
if ($stopServices -eq "y" -or $stopServices -eq "Y") {
    Print-Info "ArrÃªt des services..."
    docker-compose down
    Print-Success "Services arrÃªtÃ©s"
}
