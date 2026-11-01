# Documentation SimsLens

## Démarrer

| Document                                 | Contenu                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| [`../README.md`](../README.md)           | Présentation et démarrage rapide (en anglais)         |
| [`development.fr.md`](development.fr.md) | Variables d'environnement, TypeScript, dépannage      |
| [`database/index.md`](database/index.md) | Installer et gérer la base (Prisma, migrations, seed) |

## Contribuer

Fichiers communautaires à la racine, en anglais :

| Document                                              | Contenu                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md)               | Proposer un changement, règles de qualité, conventions     |
| [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md)         | Code de conduite (Contributor Covenant 2.1)                |
| [`SECURITY.md`](../SECURITY.md)                       | Signaler une faille en privé, délais de réponse indicatifs |
| [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Contenus tiers exclus de la licence MIT                    |

## API

| Document                                               | Contenu                                        |
| ------------------------------------------------------ | ---------------------------------------------- |
| [`api/index.md`](api/index.md)                         | Vue d'ensemble, stack, flux d'une requête      |
| [`api/architecture.md`](api/architecture.md)           | Organisation des modules, état de la migration |
| [`api/routes.md`](api/routes.md)                       | Guide : ajouter un nouveau module API          |
| [`api/context.md`](api/context.md)                     | Middlewares `checkPermission` et `validate`    |
| [`api/validation-errors.md`](api/validation-errors.md) | Validation Joi, erreurs métier, codes HTTP     |
| 🤖 [`api/reference.md`](api/reference.md)              | Inventaire des routes — **généré**             |

## Base de données

| Document                                             | Contenu                                  |
| ---------------------------------------------------- | ---------------------------------------- |
| [`database/index.md`](database/index.md)             | Installation, commandes Prisma, workflow |
| [`database/conventions.md`](database/conventions.md) | Conventions de nommage, pièges, requêtes |
| 🤖 [`database/schema.md`](database/schema.md)        | Toutes les tables et champs — **généré** |

## Frontend

| Document                                                 | Contenu                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [`frontend/forms.md`](frontend/forms.md)                 | Formulaires Mantine, React Query, notifications      |
| [`frontend/data-fetching.md`](frontend/data-fetching.md) | Appels API : couches, TanStack Query, cache, erreurs |

## Exploitation

| Document                                                 | Contenu                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| [`DOKPLOY.md`](DOKPLOY.md)                               | Exploitation de l'instance officielle (Dokploy)               |
| [`SPEC_MIGRATION_DOKPLOY.md`](SPEC_MIGRATION_DOKPLOY.md) | Migration vers Dokploy : procédure, écarts, bilan             |
| [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md)                   | Déploiement avec Docker Compose seul (instance auto-hébergée) |
| [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md)                       | Rôles et matrice des permissions                              |
| [`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md)                 | Problèmes connus laissés en l'état                            |

---

## 🤖 Documents générés

Deux fichiers sont dérivés du code et **ne doivent pas être édités à la main** — toute
modification est écrasée à la régénération :

```bash
npm run docs        # régénère les deux
```

| Fichier                                    | Dérivé de                            |
| ------------------------------------------ | ------------------------------------ |
| [`api/reference.md`](api/reference.md)     | `server/src/app.js` + `*/*.routes.*` |
| [`database/schema.md`](database/schema.md) | `server/prisma/schema.prisma`        |

À relancer après toute modification de routes ou du schéma Prisma.
