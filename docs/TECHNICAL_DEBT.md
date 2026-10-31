# 🧯 Dette technique

Registre des problèmes connus, non bloquants, volontairement laissés en l'état.
Chaque entrée indique où ça se passe, pourquoi ça compte, et quoi faire.

> Dernière revue : **2026-10-31**
> Un point corrigé se retire d'ici. Un point reporté garde sa ligne **Décision**.

| #   | Sujet                                               | Impact      | Statut          |
| --- | --------------------------------------------------- | ----------- | --------------- |
| 5   | Vulnérabilités npm en production                    | Dépendances | 🔴 Ouvert       |
| 8   | `tsx watch` ne recharge pas les fichiers `.js`      | Confort dev | 🟠 À surveiller |
| 11  | `manage_instance` accordée à aucun rôle             | Fonctionnel | 🔴 Ouvert       |
| 12  | Dérive enum `Permission` ↔ fichiers de rôle         | Maintenance | 🟠 À surveiller |
| 13  | Module `boss_killed` jamais monté                   | Code mort   | 🟢 Trivial      |
| 14  | `companion/` n'est pas un workspace npm             | Outillage   | 🟠 À surveiller |
| 17  | Entrypoint : succès affiché sur migration échouée   | Déploiement | 🔴 Ouvert       |
| 18  | `instance_boss_killed.repository` jamais implémenté | Fonctionnel | 🔴 Ouvert       |

---

## 5. Vulnérabilités npm

`npm audit --omit=dev` au 2026-10-31 : **15 vulnérabilités** dans les dépendances
d'exécution, dont **2 critiques** (`request`, abandonné, et son `form-data`) et 6 hautes.
Détail et plan : issue [#1](https://github.com/GuillaumeBarreau/simslens_app/issues/1).

**Correctif** : traiter par paquets — `npm audit fix` d'abord, puis les montées de
version majeures une par une avec les tests. Ne pas lancer `npm audit fix --force` sur
l'ensemble.

## 8. `tsx watch` ne recharge pas les fichiers `.js` du serveur

`server/package.json` lance `tsx watch ./src/www`. Le rechargement à chaud ne se
déclenche pas sur les modifications de fichiers `.js` — or le serveur est
majoritairement en JavaScript. Il faut redémarrer `npm run dev` à la main.

**Correctif** : ajouter les extensions surveillées à la commande `tsx watch`, ou
repasser sur `nodemon` pour ce workspace.

## 11. `manage_instance` n'est accordée à aucun rôle

**Où** : [`role_*.json`](../server/src/shared/config/permissions/) et
[`instance.routes.ts`](../server/src/api/instance/instance.routes.ts)

La permission `manage_instance` vaut `false` dans les **quatre** fichiers de rôle
(`admin`, `moderator`, `member`, `guest`). Or quatre routes l'exigent :

| Route                                    | Effet actuel  |
| ---------------------------------------- | ------------- |
| `POST /1/instance`                       | 403 pour tous |
| `POST /1/instance/:id/initialize-bosses` | 403 pour tous |
| `PUT /1/instance/:id`                    | 403 pour tous |
| `DELETE /1/instance/:id`                 | 403 pour tous |

**Conséquence** : créer, modifier ou supprimer une instance est impossible depuis
l'API, y compris pour un `owner`. Seules les lectures (`GET /`, `GET /:id`) passent,
car elles n'ont pas de `checkPermission`.

**Correctif** : passer `manage_instance` à `true` dans `role_admin.json` (et
probablement `role_moderator.json`), puis `npm run sync:permissions`. À confirmer :
peut-être que ces routes ne sont plus utilisées par le frontend et que la permission a
été désactivée volontairement — dans ce cas, retirer les routes.

## 12. Dérive entre l'enum `Permission` et les fichiers de rôle

**Où** : [`permissions.ts`](../server/src/shared/config/permissions/permissions.ts) vs
[`role_*.json`](../server/src/shared/config/permissions/)

| Clé                   | Dans l'enum | Dans les JSON | Conséquence                        |
| --------------------- | ----------- | ------------- | ---------------------------------- |
| `view_event_roster`   | ✅          | ❌            | Refusée à tous si un jour utilisée |
| `delete_event_roster` | ✅          | ❌            | Refusée à tous si un jour utilisée |
| `edit_event_roster`   | ❌          | ✅            | Clé morte, jamais lue              |

Aucune route n'utilise ces trois-là aujourd'hui, donc l'impact est nul — mais le
premier `checkPermission(Permission.VIEW_EVENT_ROSTER)` ajouté échouera silencieusement
pour tout le monde.

**Correctif** : aligner les deux sources, et idéalement ajouter un test qui échoue si
une valeur de l'enum est absente d'un fichier de rôle.

## 13. Le module `boss_killed` n'est jamais monté

**Où** : [`server/src/api/boss_killed/`](../server/src/api/boss_killed/)

`bossKilled.routes.js` déclare 2 routes, mais aucun `app.use()` de
[`app.js`](../server/src/app.js) ne monte ce module. Le code est inatteignable.

À ne pas confondre avec `instance_boss_killed`, lui bien monté sur
`/1/instances/:instanceId/bosses`.

**Correctif** : supprimer le module s'il a été remplacé par `instance_boss_killed`,
ou le monter s'il est encore attendu. `npm run deadcode` ne le détecte pas :
[`knip.json`](../knip.json) ne cible que le workspace `app`.

## 14. `companion/` n'est pas un workspace npm

**Où** : [`package.json`](../package.json), champ `workspaces`

`companion/` a son propre `package.json` (4 dépendances, Tauri + React) mais n'est pas
listé dans `workspaces` — qui ne contient que `app`, `app_dashboard`, `server`,
`server_discord`. Ses dépendances ne sont donc **jamais installées** par le
`npm install` de la racine.

Conséquence : `npx tsc -p companion/tsconfig.json` remonte 5 erreurs, toutes dues à
`@tauri-apps/api` et `@vitejs/plugin-react` absents — pas à la configuration.

**Correctif** : ajouter `"companion"` à `workspaces` si le projet est vivant, ou le
sortir du dépôt s'il est abandonné. En l'état il est ni compilable ni supprimé.

## 17. `docker-entrypoint.sh` signale un succès même quand la migration échoue

**Où** : [`server/docker-entrypoint.sh`](../server/docker-entrypoint.sh)

```sh
if npx prisma migrate deploy 2>&1 | grep -q "P3005"; then
  …baseline…
else
  echo "✅ Migrations applied successfully"
fi
```

Le code de retour testé est celui de `grep`, pas celui de `prisma`. Toute erreur autre
que `P3005` — base injoignable, migration invalide, `DATABASE_URL` absent — fait
échouer le `grep`, donc passe dans le `else` et affiche « ✅ Migrations applied
successfully ». Le conteneur démarre ensuite sur une base non migrée.

Constaté en lançant l'image sans `DATABASE_URL` : le message de succès s'affiche quand
même.

**Correctif** : capturer la sortie et le code de retour séparément.

```sh
out=$(npx prisma migrate deploy 2>&1) || status=$?
echo "$out"
if [ "${status:-0}" -ne 0 ]; then
  case "$out" in
    *P3005*) …baseline… ;;
    *) echo "❌ Migration échouée"; exit 1 ;;
  esac
fi
```

## 18. `instance_boss_killed.repository` n'a jamais été implémenté

**Où** :
[`server/src/api/instance_boss_killed/instance_boss_killed.repository.js`](../server/src/api/instance_boss_killed/instance_boss_killed.repository.js)

Le fichier est resté au stade d'ébauche depuis le commit initial — il porte
encore le commentaire `// Stub implementations - convert as needed` — et
n'exporte que cinq fonctions CRUD renvoyant `[]` ou `null` :

```js
module.exports = {
  list: async () => [],
  getById: async (id) => null,
  // …
};
```

Or trois services appellent sur ce module **six méthodes qui n'y existent pas** :
`createInstanceBosses`, `listInstanceBossStatuses`, `findInstanceBossStatus`,
`setInstanceBossKilled`, `setInstanceBossNotKilled` et `updateKillState`.

| Appelant                       | Méthode appelée                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `instance.service.js`          | `createInstanceBosses`                                                                                                            |
| `instance_boss_killed.service` | `listInstanceBossStatuses`, `findInstanceBossStatus`, `setInstanceBossKilled`, `setInstanceBossNotKilled`, `createInstanceBosses` |
| `boss_killed.service.js`       | `listInstanceBossStatuses`, `updateKillState`                                                                                     |

**Impact** : les routes montées sur `/1/instances/:instanceId/bosses` lèvent un
`TypeError: … is not a function`, remonté en 500 par `errorHandler`. La création
d'instance est également concernée (`instance.service` initialise les boss).

**Correctif** : implémenter le repository sur le modèle `instance_bosses` du
schéma Prisma, en suivant les signatures attendues par les appelants. Le travail
relève de la fonctionnalité, pas du refactoring : il faut décider du
comportement attendu (que renvoie `findInstanceBossStatus` pour un boss jamais
enregistré ?) avant d'écrire les requêtes.

**En attendant** : ce module est le seul de `src/api/` que `npm run lint` signale
encore (6 erreurs `no-unused-vars` sur les paramètres des stubs). Ne pas les
faire taire : elles marquent l'endroit à reprendre.

## 21. `mainCharacter` vaut toujours `null` dans le profil utilisateur

**Où** :
[`server/src/api/auth/usecases/getUserProfile.ts`](../server/src/api/auth/usecases/getUserProfile.ts)

Le profil renvoyé par `GET /1/auth/me` calculait son personnage principal
ainsi :

```js
const mainCharacter = characters.find((c) => c.isMain === 1) || null;
```

Or `characters` n'a pas de colonne `isMain`, et ce nom n'apparaît nulle part
ailleurs — ni côté serveur, ni côté client. La recherche ne trouve donc
jamais rien et le champ vaut toujours `null`.

**Impact** : nul en pratique. Le front ne lit pas `mainCharacter` ; le champ
reste dans la réponse par prudence, au cas où un client tiers en dépendrait.

**Correctif** : soit ajouter la colonne et la remplir (un membre désigne son
personnage principal), soit retirer le champ de la réponse. Le choix dépend
de la fonctionnalité voulue, pas du code.
