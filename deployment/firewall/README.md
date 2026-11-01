# Pare-feu du serveur de production

L'installeur de Dokploy expose sur l'adresse publique le panneau (port 3000) et les ports de
Docker Swarm (2377, 7946 et 4789). Avec un seul serveur, aucun ne doit être joignable depuis
Internet. Ces deux fichiers les ferment, en IPv4 et en IPv6, sans toucher aux ports 22, 80 et 443.

| Fichier                | Rôle                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `simslens-fw.sh`       | Pose (`apply`), retire (`remove`) ou affiche (`status`) les règles                                           |
| `simslens-fw.service`  | Réapplique les règles au démarrage et à chaque redémarrage de Docker                                         |
| `simslens-panel-allow` | Tient la liste des IP autorisées sur `dokploy.simslens.com` ([voir plus bas](#liste-dip-du-panneau-dokploy)) |

## Pourquoi pas `ufw` ou le pare-feu OVH

- **`ufw`** : Docker écrit ses propres règles iptables et les ports qu'il publie contournent
  celles d'`ufw`.
- **Pare-feu réseau d'OVH** : il ne filtre que l'IPv4. Le VPS a aussi une IPv6 publique, sur
  laquelle les mêmes ports écoutent.

Les règles sont dans une chaîne dédiée, `SIMSLENS-FW`, appelée depuis :

- `INPUT`, pour les ports écoutés par l'hôte (Swarm, et le relais `docker-proxy` du port 3000
  en IPv6) ;
- `DOCKER-USER`, la chaîne que Docker réserve à l'utilisateur, pour le port 3000 redirigé vers
  le conteneur Dokploy en IPv4.

Les règles gérées par Docker ne sont pas modifiées. `iptables-persistent` n'est **pas**
utilisé : il enregistrerait aussi les règles de Docker et les restaurerait en double.

## Installation

L'interface publique est `ens3` dans le script : l'adapter si elle diffère (`ip -br addr`).

```bash
sudo install -m 755 simslens-fw.sh /usr/local/sbin/simslens-fw.sh
sudo install -m 644 simslens-fw.service /etc/systemd/system/simslens-fw.service

# Filet de sécurité : retire les règles dans 5 minutes si l'accès SSH est perdu
sudo systemd-run --unit=simslens-fw-rollback --on-active=300 /usr/local/sbin/simslens-fw.sh remove
sudo /usr/local/sbin/simslens-fw.sh apply

# Depuis une AUTRE machine : une nouvelle connexion SSH doit passer, et 3000 doit être fermé
#   ssh <utilisateur>@<serveur> true
#   nc -zv <ipv4> 3000 ; nc -zv <ipv6> 3000

# Seulement si tout est bon : annuler le filet et rendre les règles permanentes
sudo systemctl stop simslens-fw-rollback.timer
sudo systemctl daemon-reload
sudo systemctl enable --now simslens-fw.service
```

## Exploitation

```bash
sudo /usr/local/sbin/simslens-fw.sh status   # règles en place
sudo systemctl stop simslens-fw              # tout rouvrir temporairement
sudo systemctl start simslens-fw             # refermer
```

Accès de secours au panneau Dokploy, port fermé : tunnel SSH.

```bash
ssh -L 3000:localhost:3000 <utilisateur>@<serveur>   # puis http://localhost:3000
```

## Liste d'IP du panneau Dokploy

Le panneau est servi sur `https://dokploy.simslens.com`, mais seulement aux adresses IP de la
liste. Traefik répond 403 à toutes les autres.

- `simslens-panel-allow` tient la liste dans `/etc/simslens/panel-allowlist`, une ligne par
  personne (`<nom> <ip>/<masque>`), et génère `/etc/dokploy/traefik/dynamic/simslens-panel.yml`.
  C'est un fichier à part, que Dokploy ne réécrit jamais : routeurs HTTP et HTTPS, certificat
  Let's Encrypt, middleware `ipAllowList`. Traefik le recharge seul.
- Une liste vide n'autorise personne (pas tout le monde).
- Le domaine n'a qu'un enregistrement **A** : un AAAA ferait passer les navigateurs par l'IPv6,
  qui change aussi et n'est pas dans la liste.
- Ne pas renseigner « Server Domain » dans les réglages de Dokploy : Dokploy créerait sa propre
  route vers le panneau, sans ce filtrage.

### Installation

```bash
sudo install -m 755 simslens-panel-allow /usr/local/sbin/simslens-panel-allow
sudo simslens-panel-allow set <nom> <ip>
```

Créer ensuite l'enregistrement DNS A `dokploy.simslens.com` vers le serveur. Si Traefik a tenté
d'émettre le certificat avant que le DNS existe, il ne réessaie pas seul :
`docker restart dokploy-traefik` (coupure de quelques secondes).

### Utilisation

```bash
sudo simslens-panel-allow list               # IP autorisées
sudo simslens-panel-allow set <nom> <ip>     # ajoute ou remplace l'IP de <nom>
sudo simslens-panel-allow remove <nom>
```

Les IP des box changent : un admin qui reçoit un 403 doit faire mettre à jour son entrée. Pour
le faire depuis son poste en une commande, une petite fonction suffit (zsh ou bash) :

```bash
simslens-panel-allow() {
  if [ $# -gt 0 ]; then ssh <utilisateur>@<serveur> sudo simslens-panel-allow "$@"; return; fi
  ssh <utilisateur>@<serveur> sudo simslens-panel-allow set <nom> "$(curl -4 -fsS https://ifconfig.me)"
}
```
