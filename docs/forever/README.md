# SimsLens Forever — audit, proposition et feuille de route

> Proposition du 2 novembre 2026, à valider par le mainteneur avant tout développement.
> Branche d'intégration : `forever`. Les faits sur le jeu sont datés : WoW Forever sort le
> 4 novembre 2026 et beaucoup de points restent inconnus (voir § 2.3). Ce document est à
> réviser au lancement, puis à chaque palier de contenu.

## Sommaire

1. [Audit de l'application actuelle](#1-audit-de-lapplication-actuelle)
2. [WoW Forever : ce qui compte pour un outil de guilde](#2-wow-forever--ce-qui-compte-pour-un-outil-de-guilde)
3. [Tableau comparatif Retail / Forever](#3-tableau-comparatif-retail--forever)
4. [Proposition fonctionnelle](#4-proposition-fonctionnelle)
5. [Besoins par classe et spécialisation](#5-besoins-par-classe-et-spécialisation)
6. [Expérience utilisateur](#6-expérience-utilisateur)
7. [Architecture technique](#7-architecture-technique)
8. [Feuille de route](#8-feuille-de-route)
9. [Décisions à prendre](#9-décisions-à-prendre)
10. [Sources](#10-sources)

---

## 1. Audit de l'application actuelle

### 1.1 Fonctionnalités

| Domaine         | Pages / modules                                                                 | Dépendance à Retail                                                          |
| --------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Accès et guilde | Login Battle.net, `RealmRedirect`, création de royaume, invités, appareil, sync | Faible (namespace `profile-{region}`, région `eu` en dur dans `passport.js`) |
| Calendrier      | `CalendarPage`, séries d'événements, flux iCal, rappels, fuseau du royaume      | Aucune                                                                       |
| Inscriptions    | Page + bot Discord (boutons TANK/HEALER/DPS, invités)                           | Liste des 13 classes en dur dans le bot                                      |
| Composition     | `EventRosterPage` (matrice par boss, notes), `composition.service.js` (985 l.)  | Forte : gain de sims, difficultés                                            |
| Roster / suivi  | `RosterPage`, `TrackingPage` (ilvl, clés, score, rapport)                       | Forte : M+, Raider.IO, buff Manaforge, fraîcheur des sims                    |
| Wishlist        | `WishlistPage` (paperdoll par slot et par spé, arbre de talents, vue roster)    | Moyenne : catalogue par saison, ilvl par difficulté, talents Dragonflight+   |
| Optimiseur      | `LootsOptimiserPage` (gains Droptimizer par boss), import Raidbots / QE Live    | Totale                                                                       |
| Loot            | Import CSV RCLC, companion → `sync_loot`, historique, équité du loot            | Moyenne : difficulté déduite du libellé, gain figé tiré des sims             |
| Donjons         | `DungeonsPage`, `DungeonComposerPage`, `KeysHistoryPage`                        | Totale (M0 / M+, Raider.IO)                                                  |
| Tableau de bord | `MyActivityPage` (upgrades par boss, spés, iCal)                                | Forte : upgrades issues des sims                                             |
| Présences       | `AttendancePage`, absences                                                      | Aucune                                                                       |
| Administration  | Réglages (validation des sims, Discord, permissions, invitations), back-office  | `validation_settings` est entièrement Raidbots                               |

### 1.2 Constats structurants

- **Aucune notion de « jeu ».** Rien ne distingue Retail d'une autre version, ni en base,
  ni dans l'API, ni dans le front. Les seuls axes existants sont `region` et le couple
  `extension` / `season` (chaînes libres sur `raids`, `bosses`, `imports`, `item_tokens`).
- **L'URL porte déjà l'extension** (`/:guild/:extension/...`), validée par
  `VALID_EXTENSIONS` (`app/src/config/seasonConfig.ts`). C'est le point d'entrée le plus
  naturel pour une seconde version du jeu.
- **Il n'y a pas de logo en haut à gauche.** L'emplacement accueille un
  `ExtensionSelector` visible seulement en dev
  (`app/src/components/design-system/organisms/Header/Header.tsx:266`). Le sélecteur de
  jeu demandé est donc à créer, mais on peut partir de ce composant.
- **Le namespace Blizzard est construit à la main dans au moins cinq fichiers**
  (`profile-${region}`, `static-${region}`). Il faut le centraliser avant d'ajouter un
  second jeu. _Fait (SIMS-020) : `blizzardNamespace()` dans `server/src/shared/game/`,
  à côté du registre des jeux `games.ts`._
- **Les référentiels de jeu sont globaux et propres à Retail** : `constants/classes.ts`
  (front), `shared/constants/wow.js` et `roles.js` (serveur), liste des classes du bot
  Discord, `DifficultyContext` (`normal | heroic | mythic`, `mythic` par défaut), table
  ilvl par difficulté.
- **Le pipeline d'import du loot est réutilisable tel quel** (`imports` →
  `imported_loots`), mais le companion ne cherche que le dossier `_retail_` et ne sait
  lire que RCLootCouncil.
- **Les feature flags sont globaux** (`FEATURES_IN_DEVELOPMENT`) : ils servent à masquer
  ce qui n'est pas prêt, pas à activer une fonctionnalité selon le jeu.
- **Identité des personnages** : `characters` est unique sur `[name, realm]`, sans
  région ni jeu. Cela posera problème avec Forever (§ 2.2).

---

## 2. WoW Forever : ce qui compte pour un outil de guilde

### 2.1 Le jeu en bref

WoW Forever est une version « Classic+ » : chronologie alternative bâtie sur vanilla,
niveau 60 définitif, contenu nouveau ajouté par paliers. Sortie le **4 novembre 2026**
(5 novembre 00:00 en Europe).

| Sujet       | Ce qu'on sait                                                                                                                                                                                                 | Fiabilité         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Raids       | **Aucun au lancement.** Le **9 décembre 2026** : **Barrow Deeps** (10 joueurs, 8 boss), **Hyjal Summit** (20 joueurs, 13 boss, itinéraires au choix), **Onyxia's Lair** (40 joueurs). Reset **hebdomadaire**. | Officiel          |
| Taille      | Fixe par raid, pas de mode flexible. Pas de difficulté héroïque/mythique annoncée.                                                                                                                            | Presse            |
| Paliers     | Chaque palier : au moins un raid à 10 et un à 20, parfois un à 40. **Les pièces de set tombent dans les trois raids du palier.**                                                                              | Presse            |
| Feuille     | Hiver : mode Hardcore. Printemps 2027 : 2 raids (10 + 20), 2 donjons, quête légendaire. Été 2027 : raid emblématique revampé (non nommé), nouveau raid, 2 donjons, métiers, Legacy.                           | Officiel / presse |
| Attunement  | Onyxia : **Drakefire Amulet** dans le sac de chaque membre ; chaîne de quêtes propre à chaque faction, par personnage. Rien d'annoncé pour les deux autres raids.                                             | Officiel          |
| Résistances | Résistance au feu recommandée pour Onyxia.                                                                                                                                                                    | Officiel          |
| Itemisation | Toucher et critique unifiés, **Expertise** façon TBC, puissance des sorts sur l'équipement de soin, nouveaux bonus de set, bijoux de niche, objets rares très convoités sur chaque boss.                      | Presse            |
| Progression | **Pas d'amélioration d'objet, pas de saison.** Intention affichée : « ne pas rendre obsolète l'ancien contenu ».                                                                                              | Presse            |
| Classes     | 9 classes vanilla, arbres de talents vanilla retravaillés pour rendre chaque spé viable (51 points au 60), **double spé au niveau 40**. Nouvelle race **Skyborne**, 6 nouvelles combinaisons race-classe.     | Presse / officiel |
| Métiers     | Monnaie **Merchant's Favor**, réputations commerciales (Azeroth Commerce Authority, Durotar Supply and Logistics), nombreux patrons d'armure liés quand ramassés.                                             | Wiki              |
| Legacy      | Points gagnés par le compte, dépensés par personnage dans des arbres (bonus de métier…). Remplace les hauts faits.                                                                                            | Wiki              |
| Serveurs    | **Plus de royaumes** : un méga-royaume par jeu de règles (Normal, PvP, RP, RP-PvP, Hardcore plus tard) et par région, avec layering. Personnages avec **prénom et nom de famille**.                           | Presse / wiki     |
| Économie    | **GDKP interdit** en Amérique du Nord et en Europe.                                                                                                                                                           | Presse            |
| Données     | ~40 % des objets sont livrés sans statistiques visibles, révélées au fil du temps.                                                                                                                            | Tiers             |

### 2.2 Conséquences pour SimsLens

1. **Le calendrier fixe la priorité.** Entre le 4 novembre et le 9 décembre, les guildes
   montent de niveau, recrutent, font leurs donjons et leur **attunement d'Onyxia**. Le
   loot n'arrive que le 9 décembre. Il faut donc livrer d'abord le socle (guilde,
   roster, calendrier, inscriptions, préparation), puis le loot.
2. **Trois raids de taille différente chaque semaine**, chacun avec son lockout. Une
   guilde de 40 joueurs devra organiser par exemple quatre groupes de 10, deux groupes
   de 20 et un raid de 40. C'est un problème de planification que Retail ne pose pas.
3. **La progression est cumulative.** Un palier n'efface pas le précédent : un objet du
   palier 1 peut rester BiS au palier 2. Les recommandations doivent porter sur un
   **ensemble croissant de raids**, pas sur « la saison courante ».
4. **La valeur d'un objet vient de sa place dans la liste BiS**, pas d'un pourcentage de
   gain simulé. Le cœur produit devient : listes BiS par classe, spé et palier ; priorités
   de loot décidées par les officiers ; suivi de complétion.
5. **L'identité d'une guilde et d'un personnage change** : pas de serveur, mais une
   région + un jeu de règles ; des noms avec nom de famille. Les clés uniques actuelles
   (`realms [region, server, guildName]`, `characters [name, realm]`) doivent intégrer le
   jeu.
6. **On ne peut pas compter sur l'API Blizzard au lancement** : aucun namespace Forever
   n'est confirmé (les essais publiés renvoient 403). L'application doit fonctionner avec
   des données saisies, importées par un addon, ou issues de référentiels maintenus par
   nous.
7. **On ne peut pas compter sur RCLootCouncil** : aucune version Forever trouvée. Des
   addons de conseil de loot dédiés existent (WLC, Arbiter Loot Council,
   SimpleLootCouncil). L'import du loot doit accepter plusieurs sources.

### 2.3 Inconnues à lever au lancement (4-5 novembre)

| Inconnue                                                      | Impact                                 | Comment la lever                                                             |
| ------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| Namespace de l'API Battle.net pour Forever                    | Sync des personnages et de la guilde   | Sonder `static/profile/dynamic-*` sur le portail développeur après la sortie |
| Méthode de loot (master loot, group loot, personal loot)      | Pertinence du conseil de loot et du SR | Notes de patch, premier raid du 9 décembre                                   |
| Addon de loot dominant et son format de SavedVariables        | Parseur du companion                   | Installer les addons, lire leurs fichiers `SavedVariables`                   |
| Dossier du client (`_classic_`, `_forever_`…)                 | Détection par le companion             | Installation du client de lancement                                          |
| Format de l'identifiant de personnage (prénom + nom, unicité) | Clés uniques en base                   | Création d'un personnage, API si disponible                                  |
| Factions des classes (paladin, chaman)                        | Compositions et priorités de loot      | Écran de création de personnage                                              |
| Lockouts partagés ou non entre raids d'un même palier         | Planificateur hebdomadaire             | Notes de patch, 9 décembre                                                   |

---

## 3. Tableau comparatif Retail / Forever

| Fonctionnalité                        | Retail (aujourd'hui)                       | Forever (cible)                                               | Verdict   |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- | --------- |
| Connexion Battle.net                  | ✅                                         | ✅ identique                                                  | Conserver |
| Guilde (« royaume »)                  | région + serveur + nom                     | région + **jeu de règles** + nom                              | Adapter   |
| Rôles, permissions, invitations       | ✅                                         | ✅ identique                                                  | Conserver |
| Calendrier, séries, iCal, fuseau      | ✅                                         | ✅ + plusieurs raids par semaine selon la taille              | Conserver |
| Inscriptions web et Discord           | ✅ 13 classes                              | 9 classes, choix du raid (10/20/40)                           | Adapter   |
| Absences, présences                   | ✅                                         | ✅ + présence par raid / groupe                               | Conserver |
| Journal d'activité, notes de boss     | ✅                                         | ✅ identique                                                  | Conserver |
| Composition de raid                   | 20 joueurs, matrice par boss, gain de sims | 10 / 20 / 40, groupes de 5, buffs de groupe, résistances      | Adapter   |
| Difficultés                           | LFR / Normal / Héroïque / Mythique         | Aucune (taille fixe par raid)                                 | Supprimer |
| Droptimizer / Raidbots / QE Live      | ✅ cœur de la valeur                       | ❌ aucun outil équivalent                                     | Supprimer |
| Optimiseur de loot par boss           | gains simulés                              | **prio BiS + prio officiers** par boss                        | Remplacer |
| Wishlist                              | par slot, par spé, saison courante         | **BiS par palier** (cumulatif), état « obtenu / manquant »    | Adapter   |
| Arbre de talents                      | Dragonflight+ via API                      | vanilla retravaillé, 51 points, double spé                    | Adapter   |
| Suivi du roster                       | ilvl, clés M+, score, fraîcheur des sims   | complétion BiS, set, attunements, résistances, métiers        | Adapter   |
| Donjons M0 / M+, historique de clés   | ✅                                         | ❌ pas de M+                                                  | Supprimer |
| Raider.IO                             | ✅                                         | ❌                                                            | Supprimer |
| Vérification des enchantements        | enchantements Retail                       | enchantements vanilla / Forever                               | Adapter   |
| Import du loot                        | RCLC (CSV + companion)                     | plusieurs addons (WLC, ALC, SLC, RCLC si porté) + CSV         | Adapter   |
| Équité du loot                        | par difficulté, fenêtre de saison          | sans difficulté, **fenêtre glissante** (pas de remise à zéro) | Adapter   |
| Gain figé sur le loot                 | % tiré des sims                            | « rang BiS » au moment du loot                                | Remplacer |
| Listes de priorité de loot            | —                                          | ✅ nouveau                                                    | Créer     |
| Soft reserve (SR)                     | —                                          | ✅ nouveau                                                    | Créer     |
| Suivi des attunements                 | —                                          | ✅ nouveau (Onyxia dès le 9/12)                               | Créer     |
| Planificateur multi-raids et lockouts | —                                          | ✅ nouveau                                                    | Créer     |
| Résistances et consommables           | —                                          | ✅ nouveau                                                    | Créer     |
| Annuaire des artisans                 | —                                          | ✅ nouveau                                                    | Créer     |
| Suivi des sets de palier              | —                                          | ✅ nouveau (pièces réparties sur 3 raids)                     | Créer     |
| Mode Hardcore                         | —                                          | statut de vie des personnages (hiver)                         | Créer     |

---

## 4. Proposition fonctionnelle

### 4.1 À conserver sans modification majeure

Socle partagé, servi par le même code pour les deux jeux :

- connexion Battle.net, appareils, invitations, invités, rôles et permissions ;
- calendrier, séries d'événements, flux iCal, rappels, fuseau horaire ;
- absences, présences, journal d'activité, notes de stratégie par boss ;
- intégration Discord (salons, messages de roster, rappels) ;
- back-office (`app_dashboard`).

### 4.2 À adapter

| Fonctionnalité  | Adaptation                                                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guilde          | Créée avec région + jeu de règles. Une guilde appartient à **un** jeu ; un même joueur peut avoir une guilde Retail et une guilde Forever.                                                                                               |
| Personnages     | Prénom + nom de famille, rattachés au jeu. Saisie manuelle par le joueur (`POST /1/character/own`, SIMS-050) ou import (addon / API quand elle existera). Double spé : deux spés par personnage, comme `character_offspecs` aujourd'hui. |
| Inscriptions    | Choix du raid (10/20/40) et du groupe. Bot Discord : classes lues depuis l'API, plus codées en dur.                                                                                                                                      |
| Composition     | Gabarits 10 / 20 / 40, groupes de 5, contrôle des buffs de groupe et des classes requises, total de résistance du raid. Pas de matrice de gain.                                                                                          |
| Wishlist → BiS  | Paperdoll conservé. Chaque slot montre la cible BiS du palier courant, l'objet porté et les étapes intermédiaires (« pré-BiS » donjon, artisanat, raid à 10 puis à 20).                                                                  |
| Mon activité    | « Ce que je peux gagner cette semaine » : objets BiS manquants par raid et par boss, attunements à faire, consommables à préparer.                                                                                                       |
| Suivi du roster | Colonnes : % BiS du palier, pièces de set, attunements, résistance au feu, métiers. Plus de clés ni de score.                                                                                                                            |
| Talents         | Arbre vanilla retravaillé, données statiques par classe (l'API Blizzard ne les fournira probablement pas). Export / import de build.                                                                                                     |
| Import du loot  | Parseurs multiples côté companion et import CSV générique ; champs normalisés (personnage, objet, boss, raid, réponse, date).                                                                                                            |
| Équité du loot  | Fenêtres glissantes (4 semaines, 12 semaines, depuis le début), pondération par taille de raid, distinction BiS / non-BiS.                                                                                                               |
| Enchantements   | Référentiel Forever ; contrôle par slot et par rôle.                                                                                                                                                                                     |

### 4.3 À supprimer pour Forever

Masqués et inaccessibles pour une guilde Forever (le code reste pour Retail) :
Droptimizer et `LootsOptimiserPage`, imports Raidbots / QE Live, réglages de validation
des sims, fraîcheur des sims, gain figé en %, sélecteur de difficulté, table ilvl par
difficulté, donjons M0 / M+, historique de clés, Raider.IO, buff Manaforge, snapshots
d'équipement Droptimizer, upgrade tracks et bonus IDs.

### 4.4 À créer

Classées par valeur pour les joueurs Forever.

#### A. Listes BiS par classe, spé et palier — **cœur du produit**

- Référentiel BiS maintenu par SimsLens : pour chaque spé et chaque palier, une liste
  ordonnée par slot (BiS, alternatives, pré-BiS), avec la source (raid, boss, donjon,
  artisanat, réputation, quête) et un lien Wowhead Forever.
- **Cumulatif** : la liste du palier 2 peut garder des objets du palier 1.
- **Surcharge par la guilde** : les officiers peuvent ajuster la liste pour leur roster
  (« chez nous, ce bijou va aux tanks »).
- **Vues dérivées** : par personnage (ce qu'il lui manque, où le trouver), par boss (qui
  en a besoin, dans quel ordre), par raid (contribution de chaque raid à la progression
  du roster).
- Pondération de stats plus tard, si un simulateur Forever apparaît : prévoir un champ
  `source` (`curated`, `guild`, `sim`) dès le départ.

#### B. Listes de priorité de loot (« loot prio »)

Pratique standard des guildes Classic : un tableau publié par les officiers,
« objet → ordre de priorité (classe/spé/rôle/joueur) + notes ». SimsLens peut la
générer à partir des BiS, la laisser éditer, la publier aux membres (transparence) et la
montrer à côté du loot pendant l'attribution.

#### C. Soft reserve (SR)

Chaque inscrit réserve 1 ou 2 objets par raid avant la soirée ; règles configurables
(MS > OS, +1, SR cumulatif d'une semaine à l'autre). Très utilisé en Classic, y compris
dans les guildes. À rendre exportable vers les addons en jeu si un format courant émerge
(à vérifier). Pertinence qui dépend de la méthode de loot (§ 2.3).

#### D. Planificateur multi-raids et lockouts

- Une semaine = jusqu'à trois raids (10, 20, 40) et plusieurs groupes.
- Répartition des joueurs par groupe, contrôle des lockouts (un personnage ne peut pas
  être dans deux groupes du même raid la même semaine), équilibre des rôles et des
  besoins BiS par groupe (envoyer dans Barrow Deeps ceux qui y ont le plus à gagner).
- Génère les événements du calendrier et les inscriptions correspondantes.

#### E. Préparation de raid

- **Attunements** : statut par personnage et par raid (Drakefire Amulet pour Onyxia),
  étapes de la chaîne de quêtes, alerte avant l'événement si un inscrit n'est pas prêt.
- **Résistances** : total par joueur et par école, objectif par rencontre (feu pour
  Onyxia), objets de résistance à viser.
- **Consommables** : liste par rôle et par rencontre (fioles, élixirs, potions de
  protection), check-list avant la soirée.

#### F. Annuaire des artisans

Qui a quel métier, quelle recette (en particulier les patrons liés quand ramassés et
les recettes du Merchant's Favor), quelles réputations commerciales. Les membres
demandent une fabrication depuis leur liste BiS.

#### G. Suivi des sets de palier

Pièces obtenues / manquantes par joueur, raid de provenance, bonus actifs. Les pièces
sont réparties sur trois raids : c'est précisément l'information qui manque aux joueurs.

#### H. Plus tard

- **Mode Hardcore** (hiver) : statut vivant / mort, historique, roster qui s'adapte.
- **Quête légendaire** (printemps 2027) : suivi des étapes et des composants.
- **Objets rares par boss** : historique des chutes, attente moyenne.
- **Legacy** : faible valeur pour une guilde, à ne pas prioriser.
- **Addon SimsLens** (optionnel) : un petit addon exportant équipement, attunements,
  résistances et métiers dans ses SavedVariables, lus par le companion. Remplace l'API si
  elle n'existe pas. À évaluer selon la politique d'addons de Blizzard.

### 4.5 Ce qu'on ne fait pas

- Pas de vote de loot dans l'application (règle du projet, inchangée) : le vote reste
  dans l'addon, l'application l'exploite.
- Pas d'enchères ni de DKP en or : le GDKP est interdit. Un DKP à points reste possible
  plus tard si des guildes le demandent, mais il n'est pas prioritaire.

---

## 5. Besoins par classe et spécialisation

Les arbres sont retravaillés et les spés « hybrides » deviennent viables : le référentiel
doit lister **toutes** les spés de chaque classe avec leur rôle, sans présumer de la méta
vanilla. Les stats à suivre changent par rapport à vanilla (toucher et critique unifiés,
Expertise, puissance des sorts sur l'équipement de soin).

| Classe    | Spés                                     | Rôles                 | Points d'attention pour l'outil                                                              |
| --------- | ---------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| Guerrier  | Armes, Fureur, Protection                | DPS mêlée, tank       | Toucher / Expertise, armes (prio de loot critique), résistance pour le tank d'Onyxia         |
| Paladin   | Sacré, Protection, Vindicte              | Soin, tank, DPS mêlée | Puissance des sorts de soin, spé tank viable, faction à vérifier                             |
| Chasseur  | Maîtrise des bêtes, Précision, Survie    | DPS distance          | Arme à distance, munitions et carquois (consommables)                                        |
| Voleur    | Assassinat, Combat, Finesse              | DPS mêlée             | Armes, Expertise, poisons (consommables)                                                     |
| Prêtre    | Discipline, Sacré, Ombre                 | Soin, DPS distance    | Puissance des sorts de soin vs dégâts : séparer les listes BiS                               |
| Chaman    | Élémentaire, Amélioration, Restauration  | DPS, soin             | Totems par groupe (composition), faction à vérifier, accessible aux Skyborne côté Horde      |
| Mage      | Arcanes, Feu, Givre                      | DPS distance          | Spé Feu face à Onyxia (dragon de feu), accessible aux Skyborne côté Alliance                 |
| Démoniste | Affliction, Démonologie, Destruction     | DPS distance          | DoT qui critiquent, plus de limite de debuffs : changements à refléter dans les BiS          |
| Druide    | Équilibre, Combat farouche, Restauration | Tank, DPS, soin       | Une spé, plusieurs rôles (ours / félin) : la BiS dépend du **rôle**, pas seulement de la spé |

Conséquence de modèle : une liste BiS se rattache à un couple **(spé, rôle)**, et un
personnage a jusqu'à deux spés (double spé au 40).

Hors équipement, le référentiel doit aussi couvrir :

- **Enchantements** par slot et par rôle ;
- **Consommables** par rôle et par rencontre ;
- **Résistances** par rencontre ;
- **Métiers** recommandés par classe (ingénierie, artisanat d'armure lié quand ramassé).

Le contenu détaillé (objets, enchantements) sera rempli au fil des paliers à partir de
Wowhead Forever et de warcraft.wiki.gg (CC BY-SA, avec attribution), en tenant compte des
~40 % d'objets dont les stats sont encore masquées.

---

## 6. Expérience utilisateur

- **Sélecteur de jeu sur le logo.** Créer un vrai logo SimsLens en haut à gauche ; au clic,
  un menu « Retail / Forever ». Chaque entrée mène à la guilde de l'utilisateur dans ce
  jeu (la dernière visitée), ou à « Créer / rejoindre une guilde Forever » s'il n'en a
  pas. Le choix est mémorisé. L'actuel `ExtensionSelector` (dev uniquement) devient un
  sous-menu de ce composant en dev.
- **Identité visuelle par jeu.** Même design system, couleur d'accent et logo décliné
  pour Forever, afin que l'utilisateur sache toujours dans quel jeu il se trouve.
- **Menus pilotés par le jeu.** Chaque entrée du méga-menu « Features » déclare les jeux
  qui la proposent ; pas d'écran vide ni de « non disponible » pour une fonctionnalité qui
  n'existe pas dans ce jeu.
- **Parcours joueur Forever** : _Mon activité_ → « Ma progression » (BiS du palier, set,
  attunements, prochain raid). Une seule page répond à « que dois-je faire cette semaine ? ».
- **Parcours officier Forever** : _Planning de la semaine_ (groupes et lockouts) →
  _Prio de loot_ → _Soirée_ (composition, contrôle de préparation) → _Import du loot_ →
  _Équité_.
- **Transparence** : les listes de priorité et le SR sont visibles des membres ; c'est ce
  qui réduit le plus les conflits de loot en Classic.
- **Création de guilde Forever** : formulaire région + jeu de règles + nom ; pas de
  serveur.

---

## 7. Architecture technique

### 7.1 Principe

Introduire un axe **`game`** (`retail` | `forever`) au-dessus de l'axe existant
`extension` / `season`, et décrire chaque jeu dans un **registre déclaratif** (classes,
spés, rôles, tailles de raid, difficultés, namespace Blizzard, base Wowhead, dossier du
client, capacités). Le code partagé lit le registre au lieu de constantes Retail ; les
fonctionnalités propres à un jeu sont des **modules distincts** activés par
**capacité**.

```
                ┌───────────────────────── socle partagé ─────────────────────────┐
                │ auth · guilde · rôles · calendrier · inscriptions · présences    │
                │ import du loot (pipeline) · Discord · design system · i18n        │
                └──────────────────────────────┬──────────────────────────────────┘
                              registre des jeux (games.ts)
                     ┌─────────────────────────┴─────────────────────────┐
              capacités Retail                                     capacités Forever
     droptimizer · mythicPlus · difficulties                bisLists · lootPriority · softReserve
     talentsApi · raiderIo · simValidation                  attunements · multiRaidPlanner · resistances
```

### 7.2 Base de données (zone sensible — validation explicite requise)

Migrations additives, sans casse pour Retail (valeur par défaut `retail`) :

| Changement                                                                                                                                                                | Pourquoi                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `realms.game` (enum `retail`/`forever`, défaut `retail`) + unicité incluant `game`                                                                                        | Une guilde appartient à un jeu                             |
| `servers.game` ; les jeux de règles Forever sont des `servers` (`slug` = `normal`, `pvp`…)                                                                                | Réutiliser la relation guilde ↔ serveur                    |
| `characters.game` + unicité `[name, realm, region, game]` ; champ `name` compatible prénom + nom                                                                          | Plus de collision entre jeux                               |
| `raids.game`, `bosses.game`, `item_tokens.game`                                                                                                                           | Cloisonner le catalogue                                    |
| Pour Forever, `season` = palier (`tier-1`, `tier-2`…) avec un ordre                                                                                                       | Réutiliser l'axe existant ; règle « cumulative » côté code |
| Nouvelles tables Forever : `bis_lists`, `bis_list_entries`, `loot_priorities`, `soft_reserves`, `character_attunements`, `character_resistances`, `character_professions` | Fonctionnalités nouvelles                                  |

Choix recommandé : **réutiliser `extension` / `season`** (Forever : `extension =
'Forever'`, `season = 'tier-N'`) plutôt qu'un nouveau modèle de contenu. La différence de
règle (Retail : une saison ; Forever : tous les paliers jusqu'au courant) est encapsulée
dans un `CatalogScope` côté serveur.

### 7.3 Serveur

- `server/src/shared/game/` : `games.ts` (registre), `catalogScope.ts`,
  `blizzardNamespace.ts` (remplace les 5 constructions dupliquées ; Forever : suffixe
  configurable, désactivé tant que l'API n'existe pas).
- Le jeu d'une requête se déduit de la guilde (`realm.game`), déjà résolue par
  `checkPermission`. Nouveau middleware `requireGameCapability('droptimizer')` sur les
  routes propres à un jeu. Il touche `server/src/middleware/` : **zone sensible**, à
  valider ; le test `routeGuards.test.ts` doit le reconnaître.
- Nouveaux modules au **pattern cible** (`usecases/` + `.ts`) : `bis_list`,
  `loot_priority`, `soft_reserve`, `attunement`, `raid_week_plan`, `profession`.
  Aucun ajout dans les `.service.js` historiques (notamment `composition.service.js`).
- Référentiels Forever versionnés dans `server/scripts/data/forever/` (classes, spés,
  raids, boss, loot tables, BiS, enchantements, consommables), chargés par les seeds
  existants. Back-office pour les corrections rapides.
- `sync_loot` : accepte un champ `source` (`rclootcouncil`, `wlc`, `alc`, `slc`, `csv`) et
  un `game` ; la difficulté devient optionnelle ; le « gain figé » devient une stratégie
  par jeu (sims pour Retail, rang BiS pour Forever).

### 7.4 Front

- `app/src/config/games/{retail,forever}.ts` + `GameContext` : le jeu se déduit du
  segment `:extension` de l'URL (`Forever` → `forever`), donc **aucune refonte des
  routes**. Les pages Retail qui ont besoin de `:season` (optimiseur) ne sont pas
  montées pour Forever.
- `<GameCapabilityGuard capability="…">` à côté de `<FeatureGuard>` ; le méga-menu et les
  colonnes de tableaux déclarent leurs capacités.
- Composants partagés paramétrés par le registre : icônes et couleurs de classe,
  `WowheadLink` (préfixe `/forever/`), `DifficultySelector` masqué s'il n'y a qu'une
  difficulté.
- Pages Forever dans `app/src/pages/forever/*`, composants métier dans
  `components/domain/forever/*` ; i18n en namespaces `forever*` (fr + en).
- Tout l'espace Forever masqué derrière un flag `forever` dans
  `FEATURES_IN_DEVELOPMENT` jusqu'à sa sortie.

### 7.5 Companion et bot Discord

- Companion : détection du dossier du client par jeu (liste configurable), trait
  `LootSourceParser` avec une implémentation par addon, envoi de `game` et `source`.
  Parseurs écrits une fois les formats de SavedVariables observés sur le client réel.
- Bot Discord : classes et rôles lus depuis l'API selon le jeu de la guilde ; commandes
  inchangées.

### 7.6 Ce qui protège Retail

- Valeur par défaut `retail` partout : aucune donnée existante ne change de sens.
- Tests de non-régression sur les routes Retail, plus des tests du registre et du
  `CatalogScope`.
- `npm run verify` sur chaque sous-branche ; synchronisation régulière `master → forever`.

---

## 8. Feuille de route

### 8.1 Organisation Git

- `forever` : branche d'intégration, créée depuis `master`.
- Chaque ticket : issue GitHub → branche `feat/SIMS-NNN` **depuis `forever`** → PR vers
  `forever`. Les conventions de la CI s'appliquent (la branche source est contrôlée, pas
  la cible).
- `master` est fusionné dans `forever` chaque semaine.
- La fusion finale `forever → master` passera par une issue et une branche
  `feat/SIMS-NNN` dédiées, car le contrôle de la CI refuserait une PR dont la branche
  source s'appelle `forever`.
- Milestones proposés : **Forever 0 · Cadrage**, **Forever 1 · Socle**, **Forever 2 ·
  Prêts pour le 9 décembre**, **Forever 3 · Loot**, **Forever 4 · Profondeur**.

### 8.2 Étapes

#### Forever 0 · Cadrage — 2 → 8 novembre

| #   | Ticket                                                                   | Type          | Périmètre |
| --- | ------------------------------------------------------------------------ | ------------- | --------- |
| 0.1 | Valider ce document et les décisions du § 9                              | Documentation | —         |
| 0.2 | Lever les inconnues du § 2.3 sur le client et l'API de lancement         | Documentation | data      |
| 0.3 | Maquettes : sélecteur de jeu, « Ma progression », planning de la semaine | Feature       | ux        |

#### Forever 1 · Socle multi-jeu — 9 → 22 novembre

| #   | Ticket                                                                                           | Type        | Périmètre         | Zone sensible  |
| --- | ------------------------------------------------------------------------------------------------ | ----------- | ----------------- | -------------- |
| 1.1 | Registre des jeux côté serveur + constructeur de namespace Blizzard centralisé                   | Refactoring | backend           | —              |
| 1.2 | Migration : colonne `game` (realms, servers, characters, raids, bosses, item_tokens) et unicités | Feature     | backend, data     | **Prisma**     |
| 1.3 | Registre des jeux côté front, `GameContext`, extension `Forever` dans les routes, flag `forever` | Feature     | frontend          | —              |
| 1.4 | Logo et sélecteur de jeu dans l'en-tête                                                          | Feature     | frontend, ux      | —              |
| 1.5 | Capacités par jeu : `GameCapabilityGuard`, menus filtrés, middleware `requireGameCapability`     | Feature     | backend, frontend | **middleware** |
| 1.6 | Création d'une guilde Forever (région + jeu de règles) et saisie des personnages (prénom + nom)  | Feature     | backend, frontend | —              |
| 1.7 | Classes, spés et rôles Forever (référentiel + icônes) ; bot Discord sans classes codées en dur   | Feature     | backend, data     | —              |

**Critère de sortie** : une guilde Forever existe, on bascule de Retail à Forever par le
logo, et Retail passe `npm run verify` sans changement de comportement.

#### Forever 2 · Prêts pour le 9 décembre — 23 novembre → 8 décembre

| #   | Ticket                                                                                       | Type    | Périmètre               |
| --- | -------------------------------------------------------------------------------------------- | ------- | ----------------------- |
| 2.1 | Catalogue palier 1 : Barrow Deeps, Hyjal Summit, Onyxia (boss, loot tables) + `CatalogScope` | Feature | backend, data           |
| 2.2 | Événements et composition 10 / 20 / 40, groupes de 5                                         | Feature | backend, frontend       |
| 2.3 | Planificateur de la semaine : groupes, lockouts, génération des événements                   | Feature | backend, frontend       |
| 2.4 | Suivi des attunements (Drakefire Amulet) et alerte avant l'événement                         | Feature | backend, frontend       |
| 2.5 | Référentiel BiS palier 1 et wishlist BiS (paperdoll)                                         | Feature | backend, frontend, data |
| 2.6 | Résistances : saisie par joueur, total du raid, objectif Onyxia                              | Feature | backend, frontend       |

**Critère de sortie** : une guilde peut planifier et remplir ses trois raids de la
semaine du 9 décembre, avec des joueurs attunés et des listes BiS.

#### Forever 3 · Loot — 9 décembre → mi-janvier

| #   | Ticket                                                                           | Type    | Périmètre         |
| --- | -------------------------------------------------------------------------------- | ------- | ----------------- |
| 3.1 | Companion : dossier Forever et parseur de l'addon de loot retenu                 | Feature | backend           |
| 3.2 | Import CSV générique du loot Forever                                             | Feature | backend, frontend |
| 3.3 | Listes de priorité de loot (générées depuis les BiS, éditables, publiées)        | Feature | backend, frontend |
| 3.4 | Vue « par boss » : qui a besoin de quoi, dans quel ordre (remplace l'optimiseur) | Feature | frontend          |
| 3.5 | Soft reserve par événement (si la méthode de loot le justifie)                   | Feature | backend, frontend |
| 3.6 | Équité du loot sans difficulté, fenêtres glissantes, rang BiS au moment du loot  | Feature | backend, frontend |
| 3.7 | Suivi des sets de palier                                                         | Feature | frontend, data    |
| 3.8 | « Ma progression » : BiS manquants, set, attunements, raids de la semaine        | Feature | frontend          |

#### Forever 4 · Profondeur — premier trimestre 2027

| #   | Ticket                                                                                | Type    | Périmètre         |
| --- | ------------------------------------------------------------------------------------- | ------- | ----------------- |
| 4.1 | Synchronisation via l'API Blizzard Forever (si le namespace existe) ou addon SimsLens | Feature | backend, data     |
| 4.2 | Annuaire des artisans et demandes de fabrication                                      | Feature | backend, frontend |
| 4.3 | Consommables et enchantements par rôle et par rencontre                               | Feature | backend, frontend |
| 4.4 | Talents Forever (arbres statiques, double spé, partage de build)                      | Feature | frontend, data    |
| 4.5 | Mode Hardcore : statut des personnages                                                | Feature | backend, frontend |
| 4.6 | Outillage back-office pour maintenir les référentiels Forever                         | Feature | backend           |

#### Ensuite, au fil des paliers (printemps et été 2027)

Contenu du palier 2 (raids à 10 et à 20, BiS cumulatives), quête légendaire, raid revampé
de l'été, révision de ce document à chaque annonce.

### 8.3 Dépendances

```
0.2 inconnues ──► 1.2 migration ──► 1.6 guilde Forever ──► 2.x préparation ──► 3.x loot
1.1 registre ───► 1.3 / 1.5 capacités ──► 1.4 sélecteur
2.1 catalogue ──► 2.5 BiS ──► 3.3 prio ──► 3.4 vue par boss
0.2 (addon de loot) ──► 3.1 companion
```

---

## 9. Décisions à prendre

| #   | Question                                                                                 | Recommandation                                                |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| D1  | Forever dans la même application (sélecteur) ou application séparée ?                    | Même application, même compte, guildes distinctes par jeu     |
| D2  | Réutiliser `extension` / `season` pour les paliers, ou nouveau modèle de contenu ?       | Réutiliser, avec un `CatalogScope` cumulatif                  |
| D3  | Accepter les migrations Prisma du ticket 1.2 et le middleware du 1.5 (zones sensibles) ? | Oui, additives et avec valeur par défaut `retail`             |
| D4  | Qui maintient les listes BiS de référence ?                                              | SimsLens maintient un socle, chaque guilde peut le surcharger |
| D5  | Soft reserve dès le palier 1 ?                                                           | Attendre la méthode de loot officielle                        |
| D6  | Développer un addon SimsLens pour Forever ?                                              | Pas avant de savoir si l'API Blizzard couvre Forever          |
| D7  | Forever ouvert à toutes les guildes ou d'abord à quelques guildes pilotes ?              | Guildes pilotes, puis ouverture                               |

---

## 10. Sources

Consultées le 2 novembre 2026.

- Annonce des raids (Barrow Deeps, Hyjal Summit, Onyxia, 9 décembre, reset hebdomadaire,
  Drakefire Amulet) : <https://worldofwarcraft.blizzard.com/en-us/news/24303009>
- Sortie le 4 novembre : <https://news.blizzard.com/en-us/article/24315820/world-of-warcraft-forever-goes-live-globally-november-4>
- Feuille de route, Skyborne, sets de palier : <https://worldofwarcraft.blizzard.com/en-us/news/24303862>
- Synthèse (serveurs, donjons, Legacy, métiers, talents) : <https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever>
- Tailles de raid, sets répartis sur trois raids : <https://classicwow.gg/forever/raids>
- Itemisation (Expertise, toucher unifié) : <https://www.method.gg/wow-forever/itemization-updates-in-world-of-warcraft-forever-expertise-spell-damage-more>
- Pas d'obsolescence de l'équipement : <https://www.pcgamer.com/games/world-of-warcraft/world-of-warcraft-forever-devs-say-gear-upgrades-will-stay-relevant-for-a-long-long-time-its-very-much-our-intention-to-try-wherever-we-can-to-not-invalidate-old-content/>
- Jeux de règles à la place des royaumes : <https://www.icy-veins.com/wow-forever/news/rulesets-replace-realms-in-wow-forever-heres-how-it-works/>
- Objets aux stats masquées : <https://www.icy-veins.com/wow-forever/news/wow-forever-hid-over-12500-items-from-dataminers-heres-whats-still-secret/>
- GDKP interdit : <https://www.wowhead.com/forever/news/gdkp-will-not-be-allowed-in-wow-forever-382968>
- Base d'objets Wowhead Forever : <https://www.wowhead.com/forever/items>
- Addons de loot Forever : <https://www.curseforge.com/wow/addons/w-l-c>, <https://www.curseforge.com/wow/addons/arbiter-loot-council>, <https://www.wowinterface.com/downloads/info27244-SimpleLootCouncil.html>
- API Battle.net, pas de namespace Forever constaté : <https://github.com/plohkoon/co-discord-bot/issues/48>
