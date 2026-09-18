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
```
*(à compléter/ajuster au fil du projet à mesure que les scripts npm réels sont créés)*
