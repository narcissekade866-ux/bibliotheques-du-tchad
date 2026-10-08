# CLAUDE.md — Contexte du projet « Bibliothèques du Tchad »

Ce fichier est le point d'entrée à lire en premier à chaque session. Il résume ce qu'il faut savoir pour travailler correctement sur ce projet sans avoir à tout redemander. Pour le détail complet, voir `docs/Cahier_des_charges_Bibliotheques_du_Tchad_v3_par_phases.md` et `SECURITY.md` (à lire avant toute tâche touchant l'authentification, la base de données ou les uploads).

## En une phrase

Plateforme web (PWA) de cartographie des bibliothèques du Tchad : recherche, carte interactive, fiches détaillées, itinéraires — pilotée par Narcisse (Club scientifique Eureka+), développée par Claude Code agissant comme développeur senior.

## Stack technique (décidée, non négociable sans validation explicite de Narcisse)

| Couche | Choix |
| --- | --- |
| Front-end | React.js, en Progressive Web App |
| Back-end / API | Node.js + Express |
| Base de données | PostgreSQL + extension PostGIS |
| Cartographie | OpenStreetMap + Leaflet |
| Stockage fichiers | Stockage local en phase pilote, migration S3-compatible envisageable plus tard |
| Hébergement cible | VPS en contrôle total + Docker (pas de plateforme managée) |

Environnement de développement local : WSL2/Ubuntu, Node.js v24 (LTS, via nvm), PostgreSQL 18 + PostGIS, base locale `bibliotheques_tchad` déjà créée.

## Règle d'architecture non négociable : extensibilité multi-villes

Le projet démarre avec N'Djaména mais **doit pouvoir s'étendre à d'autres villes du Tchad sans aucune modification du code source** :
- Toute donnée propre à une ville (nom, centre de carte, zoom par défaut, découpage administratif) vit dans les tables `VILLE` et `SUBDIVISION_ADMINISTRATIVE` en base — jamais dans une énumération codée en dur, ni côté back-end ni côté front-end.
- `SUBDIVISION_ADMINISTRATIVE` n'est peuplée que pour N'Djaména au départ (ses arrondissements) — les autres villes utilisent simplement le champ `quartier` en texte libre, c'est normal et voulu.
- Avant d'accepter tout code qui listerait des villes ou des arrondissements en dur, s'arrêter et corriger vers une lecture en base.

## Structure du dépôt

```
bibliotheques-du-tchad/
├── CLAUDE.md                  ← ce fichier
├── SECURITY.md                ← règles de sécurité, à relire avant tout code sensible
├── backend/                   ← API Node.js/Express
├── frontend/                  ← application React (PWA)
├── docs/
│   ├── Cahier_des_charges_Bibliotheques_du_Tchad_v3_par_phases.md
│   └── Cartographie_Bibliotheques_XLSForm.xlsx   ← formulaire de collecte KoboToolbox de référence
├── .env.example                ← variables attendues, sans valeurs réelles
└── .gitignore
```

## Modèle de données

15 entités alignées sur les 15 sections du formulaire de collecte terrain (A à O), plus les tables transverses (`UTILISATEUR`, `IMAGE`, `AVIS`, `HISTORIQUE_MODIFICATION`, `ENQUETE`) et les deux tables d'extensibilité (`VILLE`, `SUBDIVISION_ADMINISTRATIVE`). Détail complet dans le cahier des charges, section 7.2. Ne pas improviser un schéma différent sans repartir de ce dictionnaire de données.

## Origine des données

- Collecte terrain déjà réalisée sur papier (15 sections, sans GPS) pour les bibliothèques de N'Djaména.
- Digitalisation + relevé GPS manquant en cours via KoboToolbox (fichier XLSForm de référence dans `docs/`).
- Chaque groupe de questions Kobo porte le nom de sa table cible (`group_bibliotheque`, `group_localisation`, etc.) — un script d'import doit s'appuyer sur cette correspondance directe plutôt que de redéfinir un mapping à la main.
- Le champ `bibliotheque_id` de chaque soumission Kobo relie la donnée numérique à la fiche papier d'origine.

## Cycle de validation des données (fonctionnalité cœur, pas une option)

Toute création ou modification de fiche passe par un statut `en_attente` avant publication, validée ou rejetée (avec motif) par un administrateur. Aucune fiche `en_attente` ou `rejetée` ne doit être visible publiquement. Détail des règles de gestion : cahier des charges §6.5.

## Sécurité

Voir `SECURITY.md` — à relire systématiquement avant toute tâche touchant l'authentification, une requête à la base de données, un endpoint recevant des entrées utilisateur, ou un upload de fichier. En résumé : requêtes SQL toujours paramétrées, mots de passe hachés (bcrypt/argon2), validation serveur systématique, aucun secret en dur dans le code.

## Discipline de travail attendue

- Un commit par fonctionnalité stable, message explicite — pas de code non testé poussé directement sur la branche principale.
- Toute proposition qui remettrait en cause un choix déjà arrêté ci-dessus (stack, hébergement, règle multi-villes) doit être signalée explicitement à Narcisse avant d'être implémentée, jamais appliquée silencieusement.
- Pour toute route touchant l'authentification, la base de données ou les fichiers : expliquer par écrit les choix de sécurité faits, avant que le code soit validé.
- Avancement du projet suivi par phase dans le cahier des charges (tableau de bord en tête de document) — mettre à jour le statut d'une phase quand ses livrables sont effectivement complétés.

## Commandes utiles

```
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Base de données (démarrer PostgreSQL si arrêté)
sudo service postgresql start

# Migrations
cd backend && npm run migrate:up       # appliquer les migrations en attente
cd backend && npm run migrate:down     # annuler la dernière migration
cd backend && npm run migrate:create -- nom-de-la-migration  # créer une nouvelle migration
```

## Autonomie décisionnelle

Je ne suis pas développeur et je ne peux pas arbitrer entre des choix techniques
(quelle bibliothèque, quelle structure de code, quel pattern d'implémentation).
Tu es donc autorisé à décider seul de ces points, à condition de respecter cet
ordre de priorité strict, dans cet ordre, en cas de choix concurrents :

1. Sécurité (voir SECURITY.md — non négociable)
2. Performance (temps de réponse, charge, scalabilité)
3. Modernité et maintenabilité (code lisible, à jour, standards actuels)

Prends la décision techniquement la plus solide selon ces critères, sans me
demander de choisir entre des options que je ne peux pas évaluer moi-même.

### Ce que tu dois valider seul (construire → vérifier → valider)
Pour chaque tâche : implémente la solution que tu juges la meilleure selon les
critères ci-dessus, teste-la toi-même (tests automatiques + vérification manuelle
du comportement), corrige si nécessaire, puis considère-la validée sans attendre
ma confirmation — sauf dans les cas listés ci-dessous.

### Ce qui nécessite toujours mon accord explicite avant d'agir
- Toute décision qui contredirait une entrée du Journal des décisions (cahier des
  charges) : stack technique, hébergement, règle multi-villes.
- Toute action irréversible ou destructrice : suppression de données, migration
  de base de données qui écrase des données existantes, changement d'hébergeur.
- Toute décision impliquant un coût récurrent nouveau ou significatif.
- Toute déviation aux règles de SECURITY.md.
Dans ces cas, arrête-toi, explique clairement l'enjeu et attends ma réponse.

### Rapport à la fin de chaque phase
Une fois une phase du cahier des charges terminée, envoie-moi un rapport complet
et compréhensible pour un non-développeur, structuré ainsi :
- Ce qui a été construit (en langage simple, pas seulement des noms de fichiers)
- Les décisions techniques prises et pourquoi (en lien avec sécurité/performance/
  modernité)
- Ce qui a été vérifié et comment (tests effectués)
- Ce que ça change concrètement pour l'utilisateur final ou pour moi
- Ce qui reste à faire avant de passer à la phase suivante

Applique cette règle dès maintenant pour la suite du projet.

## Formulaire de collecte
Le formulaire Kobo (XLSForm v2) est dans docs/kobo/. Les noms de champs (colonne name) servent de reference pour import des donnees Kobo.
