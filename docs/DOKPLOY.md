# Exploitation de l'instance officielle (Dokploy)

> **Production du mainteneur.** Depuis le 2026-11-01, `simslens.com` tourne sur
> [Dokploy](https://dokploy.com) (Traefik + Docker Swarm) sur un VPS. Ce guide décrit les
> gestes courants. La migration elle-même est documentée dans
> [`SPEC_MIGRATION_DOKPLOY.md`](SPEC_MIGRATION_DOKPLOY.md). Pour héberger votre propre instance
> sans Dokploy, voir [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md).

## Vue d'ensemble

```
Internet ─► Traefik (Dokploy, TLS Let's Encrypt, ports 80/443)
              └─► nginx ──┬─► server :5000 ──► postgres, redis
                          ├─► client      (application)
                          ├─► dashboard   (/dashboard/)
                          └─► simslens-landing (vitrine, via le réseau simslens-net)
            discord (bot) ──► server
```

| Service Dokploy (projet `simslens`) | Source                                           | Fichier Compose                |
| ----------------------------------- | ------------------------------------------------ | ------------------------------ |
| `simslens`                          | ce dépôt, branche `deploy`                       | `./docker-compose.dokploy.yml` |
| `landing`                           | dépôt privé `simslens_landing`, branche `deploy` | `./docker-compose.yml`         |

- Traefik ne voit que `nginx` : les domaines `simslens.com` et `www.simslens.com` pointent vers
  le service `nginx`, port 80. Nginx fait le routage par chemin
  ([`nginx.dokploy.conf`](../deployment/nginx/nginx.dokploy.conf)).
- La landing rejoint Nginx sur le réseau externe `simslens-net` (créé une fois :
  `docker network create simslens-net`). Si elle est absente, Nginx sert l'application à la
  place.
- Dokploy lance chaque service Compose sous le nom de projet `<appName>` (affiché dans le
  service, onglet General). Les conteneurs s'appellent `<appName>-<service>-1` et les volumes
  `<appName>_droptimizer-pg-data` et `<appName>_redis_data`.

## Accès

- **SSH** : `ssh <utilisateur>@<serveur>`.
- **Panneau Dokploy** : `https://dokploy.simslens.com`, **réservé à une liste d'adresses IP**
  (les autres reçoivent un 403). Le compte admin est protégé par le 2FA. Voir
  [Liste d'IP du panneau](../deployment/firewall/README.md#liste-dip-du-panneau-dokploy).
  - Les IP des box changent : si le panneau répond 403, mettre à jour son IP (commande
    `simslens-panel-allow`, voir le lien ci-dessus).
  - Le domaine n'a qu'un enregistrement **A**, pas de AAAA : le filtrage ne porte que sur
    l'IPv4, plus stable.
  - Ne **pas** renseigner « Server Domain » dans les réglages de Dokploy : Dokploy créerait sa
    propre route vers le panneau, sans le filtrage.
- **En secours** (IP inconnue, liste cassée) : le port 3000 est fermé depuis Internet
  ([pare-feu](../deployment/firewall/README.md)), mais un tunnel SSH passe toujours :
  ```bash
  ssh -L 3000:localhost:3000 <utilisateur>@<serveur>   # puis http://localhost:3000
  ```

## Mettre en production

Chaque service suit une branche **`deploy`**, que l'on avance depuis la branche principale de son
dépôt quand on veut mettre en production. Le travail courant passe par les PR comme d'habitude.

```bash
# Application (dans simslens_app)
git fetch origin && git push origin origin/master:deploy
# Landing (dans simslens_landing)
git fetch origin && git push origin origin/main:deploy
```

Avance rapide uniquement, jamais de push forcé. Pas de PR de `master` vers `deploy` : le
contrôle « Conventions » de la CI exige une branche `feat/SIMS-<n°>`.

Le déploiement se lance ensuite :

- **automatiquement**, si le service a l'option **Auto Deploy** et une source **GitHub** (l'app
  GitHub de Dokploy reçoit la notification du push) ;
- **à la main** sinon : service → **Deploy**. C'est le cas d'une source **Git** (simple URL du
  dépôt) : Dokploy n'y est pas prévenu des pushs, même avec Auto Deploy.

Suivre le build dans l'onglet **Deployments**. Les migrations Prisma sont appliquées au
démarrage du `server`.

## Gestes courants

| Besoin                        | Où                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Redéployer                    | Service → **Deploy**                                                                          |
| Logs d'un conteneur           | Service → **Logs** (ou `docker logs -f <appName>-server-1`)                                   |
| Logs d'un déploiement         | Service → **Deployments**, ou `/etc/dokploy/logs/<appName>/` sur le serveur                   |
| Modifier une variable         | Service → **Environment**, puis **Deploy**                                                    |
| Ajouter ou changer un domaine | Service → **Domains**, puis **Deploy** (un service Compose ne les applique qu'au déploiement) |
| Redémarrer un conteneur       | `docker restart <appName>-<service>-1`                                                        |

Les variables `VITE_*` sont lues **au build** des images `client` et `dashboard` : après les
avoir modifiées, il faut redéployer, pas seulement redémarrer.

## Sauvegardes

> ⚠️ Les sauvegardes planifiées ne sont **pas encore configurées** (destination à choisir).
> D'ici là, faire une sauvegarde manuelle avant toute opération risquée.

Sauvegarde manuelle de la base, à copier ensuite hors du serveur :

```bash
P=<appName>
docker exec $P-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > simslens-$(date +%F).dump
docker exec $P-redis-1 redis-cli SAVE && docker cp $P-redis-1:/data/dump.rdb redis-$(date +%F).rdb
```

### Restaurer la base

Arrêter d'abord ce qui écrit en base, pour que rien ne s'intercale pendant la restauration :

```bash
P=<appName>
docker stop $P-server-1 $P-discord-1
docker exec -i $P-postgres-1 sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < simslens-AAAA-MM-JJ.dump
docker start $P-server-1 $P-discord-1
```

Vérifier ensuite les logs du `server` (migrations) et quelques comptages
(`select count(*) from characters;`). Pour tester une sauvegarde sans toucher à la production,
la restaurer dans un conteneur `postgres:15-alpine` temporaire (voir la spec de migration,
section 8).

## Mettre à jour Dokploy

Depuis le panneau (paramètres du serveur, section des mises à jour), ou en ligne de commande
après avoir relu le script :

```bash
curl -sSL https://dokploy.com/install.sh -o dokploy-install.sh
less dokploy-install.sh
sudo bash dokploy-install.sh update
```

Faire une sauvegarde de la base avant. La mise à jour remplace l'image du service `dokploy`
sans toucher aux services déployés.

## Ajouter un nouveau service

1. Dans Dokploy, **Create Service** (application, base de données ou Compose), source
   **GitHub** (l'app GitHub de Dokploy doit avoir accès au dépôt).
2. Lui donner **son propre domaine** dans l'onglet **Domains** : il est servi directement par
   Traefik, sans passer par le Nginx de SimsLens.
3. Créer l'enregistrement DNS A vers le serveur, puis **Deploy**.

N'utiliser `simslens-net` et le Nginx de SimsLens que pour un service qui doit vivre sous
`simslens.com` (comme la landing).

## Pare-feu

Voir [`deployment/firewall/README.md`](../deployment/firewall/README.md). En bref :
`sudo /usr/local/sbin/simslens-fw.sh status` pour l'état, `sudo systemctl stop simslens-fw`
pour tout rouvrir temporairement.

## Dépannage

| Symptôme                                           | Piste                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 403 sur `dokploy.simslens.com`                     | L'IP de la box a changé : `simslens-panel-allow` (voir [Accès](#accès)), ou passer par le tunnel SSH        |
| Certificat absent juste après la création d'un DNS | Traefik ne retente pas seul un échec ACME : `docker restart dokploy-traefik` (coupure de quelques secondes) |
| 404 de Traefik sur le domaine                      | Le domaine est déclaré mais le service n'a pas été redéployé, ou `nginx` n'est pas sur `dokploy-network`    |
| Certificat non émis                                | DNS A incorrect, ou e-mail Let's Encrypt invalide (Settings → Web Server)                                   |
| La page d'accueil affiche l'application            | `simslens-landing` absent ou hors de `simslens-net` (`docker inspect simslens-landing`)                     |
| Le `server` redémarre en boucle                    | `docker logs <appName>-server-1` : migration en échec, base injoignable, variable manquante                 |
| Déploiement de la landing en échec (nom déjà pris) | Un ancien conteneur `simslens-landing` existe encore hors Dokploy : le supprimer                            |
