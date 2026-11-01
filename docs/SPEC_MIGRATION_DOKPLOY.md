# Spec : migration de la stack SimsLens vers Dokploy

> Document destiné à un LLM/agent exécutant, avec accès SSH au serveur.
> Langue des échanges avec l'utilisateur : français.

## 1. Objectif

Migrer la stack Docker Compose de ce dépôt vers **Dokploy** (PaaS auto-hébergé, Traefik + Docker Swarm) **sans perte de données Postgres**. Le domaine est `simslens.com` (et `www.simslens.com`).

**Une coupure du site et des services est acceptée** pendant toute la migration (de la Phase 1 à la fin de la Phase 4). On privilégie donc une procédure simple et sûre à une coupure courte : pas de fonctionnement en parallèle des deux stacks.

## 2. Contexte

- Serveur : VPS Linux, environ 8 Go de RAM, partagé avec d'autres services Docker.
- Stack actuelle : [docker-compose.yml](../docker-compose.yml), 7 services : `nginx`, `server`, `client`, `dashboard`, `discord`, `postgres` (15-alpine), `redis` (7-alpine).
- Volumes nommés : `droptimizer-pg-data` (Postgres), `redis_data` (Redis). Le nom réel sur l'hôte est préfixé par le nom du projet Compose (à vérifier avec `docker volume ls`).
- Nginx actuel (conteneur) : ports 80/443, certificats Certbot dans `/etc/letsencrypt`. Config : [deployment/nginx/nginx.conf](../deployment/nginx/nginx.conf).
- Conteneur externe optionnel `simslens-landing` (autre dépôt), joint par Nginx via le DNS Docker. Il est aujourd'hui rattaché au réseau par défaut de l'ancienne stack (`<projet>_default`).
- Au démarrage, le conteneur `server` applique les migrations Prisma (`prisma migrate deploy`, voir [server/docker-entrypoint.sh](../server/docker-entrypoint.sh)). Il ne doit donc pas tourner pendant une restauration de la base.
- Redis contient les sessions et les jobs BullMQ. Ce ne sont pas des données métier.
- Fichiers déjà préparés dans le dépôt (ne pas les réécrire, les valider ; seul l'ajout du réseau de la landing est prévu, Phase 2) :
  - `docker-compose.dokploy.yml` : nginx sans ports publiés (`expose: 80`), sans `/etc/letsencrypt`, sans ports 5433/6380.
  - `deployment/nginx/nginx.dokploy.conf` : HTTP seul, `X-Forwarded-Proto` et `X-Forwarded-For` lus depuis Traefik, redirection `www` → domaine canonique. Compatible avec `app.set('trust proxy', 1)` du serveur : rien à changer côté Express.

## 3. Règles impératives (garde-fous)

1. **Ne jamais** exécuter `docker compose down -v`, `docker volume rm`, `docker system prune --volumes` ni supprimer `/etc/letsencrypt`.
2. **Ne rien exécuter de destructif sans accord explicite** de l'utilisateur. Chaque phase se termine par une validation.
3. Ne pas exécuter `curl | sh` sans avoir lu le script (`curl -sSL https://dokploy.com/install.sh -o install.sh && less install.sh`).
4. Ne jamais afficher ni écrire dans le dépôt les secrets du `.env`.
5. Ne pas toucher aux autres conteneurs du serveur qui n'appartiennent pas à cette stack.
6. En cas d'erreur ou de comportement inattendu : **arrêter, ne pas improviser**, appliquer le retour arrière (section 9) si nécessaire et rendre compte.
7. Le déploiement en production relève du mainteneur (voir `CLAUDE.md`) : toute commande qui modifie l'état du serveur est soumise à l'utilisateur avant exécution.
8. Les deux stacks ne tournent **jamais** en même temps (risque de doublons : jobs BullMQ, bot Discord connecté deux fois avec le même token).

## 4. Phase 0 : inventaire (lecture seule)

Exécuter et consigner les sorties :

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
docker network ls
docker network inspect $(docker network ls -q) --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}} {{end}}'
docker volume ls
docker info --format 'Swarm: {{.Swarm.LocalNodeState}}'
ss -tlnp | grep -E ':(80|443|3000)\b'
free -h; df -h /
ls /etc/letsencrypt/live
docker compose ls
docker inspect simslens-landing --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null
```

Vérifier et signaler :

- Le nom de projet Compose actuel et les noms réels des volumes.
- Si Swarm est déjà actif (`active`) : c'est un bon signe pour l'installation.
- Les **plages d'adresses** des réseaux Docker existants. Dokploy crée `10.0.0.0/24` (ingress) et `172.18.0.0/16` (docker_gwbridge). Signaler tout chevauchement.
- Quels autres services écoutent sur 80/443 (hors cette stack). **Point bloquant** : l'installeur Dokploy exige que 80/443 soient libres, et Traefik devra ensuite servir ces autres sites aussi.
- La présence de `simslens-landing` et ses réseaux.
- RAM disponible : minimum 2 Go libres pour Dokploy, plus la marge nécessaire au build des images sur le serveur (les builds Vite sont gourmands).

**Critère de sortie** : rapport d'inventaire validé par l'utilisateur. Si un conflit de ports ou de réseau existe, proposer une solution avant de continuer.

## 5. Phase 1 : coupure et sauvegardes (obligatoire avant tout arrêt complet)

Prévenir l'utilisateur : **début de la coupure du site**.

1. Arrêter les services qui écrivent en base, en gardant `postgres` et `redis` en marche pour les sauvegardes :
   ```bash
   docker compose stop nginx server discord client dashboard
   ```
   Aucune écriture n'a lieu à partir de ce point : le dump sera complet.
2. Relever le nombre de lignes des tables principales (référence pour la section 10) et le consigner :
   ```bash
   docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
     "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;"
   # puis un SELECT count(*) exact sur les tables clés (personnages, inscriptions, loot…)
   ```
3. Sauvegarder, dans un dossier horodaté `~/backup-$(date +%F)` :
   ```bash
   # Dump logique Postgres (utiliser les valeurs réelles de DB_USER / DB_NAME)
   docker compose exec -T postgres pg_dumpall -U "$DB_USER" > pg_dumpall.sql
   docker compose exec -T postgres pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$DB_NAME.dump"
   # Redis : forcer une sauvegarde
   docker compose exec -T redis redis-cli SAVE
   # Archive des volumes (via conteneur temporaire alpine, lecture seule)
   docker run --rm -v <volume_pg>:/v:ro -v "$PWD":/b alpine tar czf /b/pg-volume.tgz -C /v .
   docker run --rm -v <volume_redis>:/v:ro -v "$PWD":/b alpine tar czf /b/redis-volume.tgz -C /v .
   # Config
   cp <dépôt>/.env <dépôt>/docker-compose.yml <dépôt>/deployment/nginx/nginx.conf "$PWD"/
   tar czf letsencrypt.tgz /etc/letsencrypt
   ```

Vérifications obligatoires :

- Les fichiers existent, taille non nulle, `pg_restore --list "$DB_NAME.dump" | head` fonctionne.
- Copier les sauvegardes **hors du serveur** (scp vers la machine de l'utilisateur). Elles contiennent le `.env` : les traiter comme des secrets.

**Critère de sortie** : sauvegardes vérifiées et copiées hors serveur, comptages consignés, confirmation de l'utilisateur.

## 6. Phase 2 : préparation du dépôt

1. Relire `docker-compose.dokploy.yml` et `deployment/nginx/nginx.dokploy.conf`. Vérifier la cohérence avec les fichiers d'origine (`diff`).
2. Valider la syntaxe : `docker compose -f docker-compose.dokploy.yml config -q`.
3. Décider du maintien des **noms de volumes** :
   - **Option A (recommandée)** : laisser Dokploy créer de nouveaux volumes et **restaurer le dump** (section 8). L'ancien volume n'est jamais modifié : le retour arrière (section 9) reste propre.
   - **Option B** : déclarer les volumes `external: true` avec les noms réels existants, pour les réutiliser sans restauration. Plus rapide, mais la nouvelle stack écrit dans le volume de l'ancienne. Attention : changer `DB_PASSWORD` ne change pas le mot de passe d'un volume Postgres déjà initialisé ; le serveur ne pourrait plus se connecter.
4. Pour que le conteneur `simslens-landing` soit joignable, déclarer dans `docker-compose.dokploy.yml` un réseau externe partagé `simslens-net` auquel `nginx` est rattaché (en plus de `default`). Sinon la landing retombe sur `@client_fallback`.
5. Créer une issue GitHub, puis travailler sur la branche **`feat/SIMS-0xx`** correspondante (convention imposée par la CI « Conventions », voir `CLAUDE.md`). Ouvrir la PR vers `master` ; pas de fusion sans accord du mainteneur. Une fois la migration validée, faire pointer Dokploy sur `master`.

**Critère de sortie** : compose valide, branche poussée, choix A/B validé.

## 7. Phase 3 : installation de Dokploy

1. Préparer le réseau de la landing (si `simslens-landing` existe) :
   ```bash
   docker network create simslens-net
   docker network connect simslens-net simslens-landing
   ```
2. Arrêter l'ancienne stack **sans supprimer les volumes** : `docker compose down` (jamais `-v`). Si `down` signale que le réseau `<projet>_default` a encore des points de terminaison (la landing), c'est attendu : ne pas forcer.
3. Installer Dokploy après lecture du script : `bash install.sh`.
4. Vérifier : `docker service ls`, `docker ps`, accès au panneau sur `http://<ip>:3000`.
5. Créer le compte admin, **activer le 2FA**.
6. Configurer le domaine du panneau (ex. `dokploy.<domaine>`) en HTTPS. Une fois ce domaine fonctionnel, **fermer le port 3000** via le pare-feu du fournisseur ou la chaîne iptables `DOCKER-USER`. **`ufw` ne suffit pas** : Docker contourne ses règles pour les ports qu'il publie. Vérifier depuis une autre machine : `nc -zv <ip> 3000` doit échouer.
7. Vérifier que les autres conteneurs existants hors stack tournent toujours (`docker ps` comparé à la Phase 0).

**Critère de sortie** : Dokploy accessible en HTTPS, port 3000 fermé de l'extérieur, aucun autre conteneur impacté.

## 8. Phase 4 : déploiement du projet dans Dokploy

1. Créer un projet (ex. `simslens`) puis un service de type **Compose** relié au dépôt Git (branche `feat/SIMS-0xx`), fichier `docker-compose.dokploy.yml`.
2. Renseigner les variables d'environnement depuis le `.env` (saisie par l'utilisateur, ne pas les journaliser). Variables requises : `BNET_ID`, `BNET_SECRET`, `DISCORD_*`, `CLIENT_URL`, `SERVER_API_URL`, `SESSION_SECRET`, `CLERK_*`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `VITE_*`. `CLIENT_URL` doit commencer par `https://` (sinon les cookies ne sont pas `secure`).
3. **Définir `DB_PASSWORD`** explicitement (le défaut `postgres` est à proscrire).
4. Déployer la stack. Dokploy déploie un service Compose en bloc : on ne peut pas lancer `postgres` seul. Dès la fin du déploiement, **arrêter `server` et `discord`** pour que rien n'écrive pendant la restauration :
   ```bash
   docker ps --format '{{.Names}}' | grep -E 'server|discord'   # repérer les noms générés par Dokploy
   docker stop <server_container> <discord_container>
   ```
5. Restaurer (option A) dans la base créée par `POSTGRES_DB` :
   ```bash
   docker exec -i <postgres_container> pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < "$DB_NAME.dump"
   ```
   Le serveur a pu appliquer les migrations sur la base vide avant d'être arrêté ; `--clean --if-exists` remplace ce schéma par celui du dump, table `_prisma_migrations` comprise. Comparer ensuite les comptages à ceux de la Phase 1.
6. Redis : par défaut, il repart vide (les utilisateurs devront se reconnecter, les jobs en attente sont perdus). Si l'utilisateur veut conserver l'état : arrêter le conteneur Redis, copier `dump.rdb` de la sauvegarde dans le nouveau volume, le redémarrer.
7. Redémarrer `server` et `discord` (`docker start …`, ou redéployer depuis Dokploy). Attendre les healthchecks de `server`, `postgres` et `redis`. Vérifier dans les logs du serveur que `prisma migrate deploy` ne signale aucune migration en échec.
8. Onglet **Domains** : `simslens.com` → service `nginx`, port `80`, HTTPS activé (Let's Encrypt). Ajouter `www.simslens.com` → même service. Vérifier que les enregistrements DNS A pointent vers le serveur. Vérifier que `nginx` est bien rattaché à `dokploy-network` (`docker inspect`) ; sinon Traefik ne peut pas le joindre.
9. Configurer les **sauvegardes planifiées** de la base et les notifications d'échec. Vérifier ce que la version installée de Dokploy propose pour un Postgres déclaré dans un Compose ; à défaut, planifier un `pg_dump` par cron vers la destination choisie (S3 ou autre).
10. Ne pas copier `/etc/letsencrypt` dans Dokploy. Traefik émet ses propres certificats.

Prévenir l'utilisateur : **fin de la coupure** une fois les critères de la section 10 vérifiés.

## 9. Retour arrière

Si la migration échoue et que l'utilisateur le demande :

1. Arrêter la stack dans Dokploy (sans supprimer les volumes).
2. Libérer 80/443 : arrêter Traefik de Dokploy (`docker service scale dokploy-traefik=0` ou `docker stop dokploy-traefik` selon l'installation).
3. Relancer l'ancienne stack : `docker compose -f docker-compose.yml up -d` (avec l'option A, les anciens volumes sont intacts).
4. Si la landing a perdu l'ancien réseau : `docker network connect <projet>_default simslens-landing`.
5. Vérifier `https://simslens.com`.
6. En dernier recours, restaurer depuis les sauvegardes de la Phase 1.

## 10. Critères d'acceptation (tests)

- [ ] `https://simslens.com` répond 200 avec un certificat valide.
- [ ] `https://www.simslens.com` redirige en 301 vers `https://simslens.com`.
- [ ] `http://simslens.com` redirige vers HTTPS.
- [ ] `/health`, `/1/...`, `/auth/` et `/admin/` atteignent le `server`.
- [ ] `/dashboard/` charge le dashboard.
- [ ] Connexion Battle.net et Discord OK (cookies, callback), avec `X-Forwarded-Proto: https` bien reçu.
- [ ] Upload jusqu'à 50 Mo accepté (`client_max_body_size`).
- [ ] Landing (`/`, `/en/`, `/images/`, `/sitemap.xml`) servie par `simslens-landing`, ou fallback propre vers `client` s'il est absent.
- [ ] Nombre de lignes des tables clés identique aux comptages consignés en Phase 1.
- [ ] Le bot Discord est connecté, une seule instance.
- [ ] Les autres conteneurs du serveur sont inchangés.
- [ ] Une sauvegarde planifiée s'exécute avec succès et la restauration a été testée sur une base temporaire.
- [ ] Le port 3000 est fermé depuis l'extérieur (`nc -zv <ip> 3000` depuis une autre machine).

## 11. Livrables attendus de l'agent

1. Rapport d'inventaire (Phase 0).
2. Journal des commandes exécutées et de leurs résultats (sans secrets).
3. Liste des écarts par rapport à cette spec et leur justification.
4. Check-list des critères d'acceptation cochée.
5. Procédure d'exploitation courte : redéployer, restaurer une sauvegarde, mettre à jour Dokploy.

## 12. Points ouverts à trancher avec l'utilisateur avant de commencer

- Option A ou B pour les volumes (section 6). Recommandation : A.
- Autres services du serveur sur 80/443 : à migrer derrière Traefik ou à déplacer (bloquant pour l'installation).
- Redis : repartir vide (déconnexion de tous les utilisateurs) ou restaurer `dump.rdb`.
- Domaine du panneau Dokploy et accès (VPN ou public).
- Destination des sauvegardes planifiées (S3 ?).
- Sort du conteneur `simslens-landing` (le rattacher à Dokploy ou le laisser hors Dokploy sur le réseau partagé `simslens-net`).
- Dokploy ou Coolify : cette spec suppose **Dokploy**. Il active Docker Swarm, ce qui est le principal risque sur un serveur qui héberge d'autres services.

Décisions déjà prises :

- Une coupure du site et des services est acceptée pendant toute la migration (section 1).
