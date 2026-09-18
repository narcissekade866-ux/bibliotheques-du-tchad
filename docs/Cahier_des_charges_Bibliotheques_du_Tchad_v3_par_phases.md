## RÉPUBLIQUE DU TCHAD
Unité – Travail – Progrès

# CAHIER DES CHARGES — Version 3 (structurée par phases)
## Plateforme numérique « Bibliothèques du Tchad »

Cartographie, valorisation et facilitation de l'accès aux bibliothèques de N'Djaména et du Tchad

| Porteur du projet | SAYBA |
| --- | --- |
| Zone d'intervention | N'Djaména (phase pilote), extension nationale |
| Mise en œuvre par | Eureka+ |
| Développement | Claude Code (piloté par Narcisse, via Claude Desktop / terminal WSL2-Ubuntu) |
| Version | 3 — septembre 2026 — remplace la v2.1 (juillet 2026) |

---

## Comment utiliser ce document

Ce cahier des charges est réorganisé **par phase de développement** plutôt que par thème, pour servir de feuille de route unique consultable par Claude Code tout au long du projet.

- Chaque phase porte un **statut** (Terminé · En cours · À venir) à mettre à jour au fil de l'avancement — Claude Code doit le faire évoluer lorsqu'un livrable de la phase est complété.
- Le **Journal des décisions** ci-dessous fait foi sur tout choix déjà arrêté : ne pas rouvrir un débat qu'il tranche déjà, sauf demande explicite de Narcisse.
- Ce document remplace la v2.1 comme référence contractuelle et fonctionnelle du projet (voir section Livrables, Phase 5).

---

## Tableau de bord des phases

| Phase | Contenu | Statut |
| --- | --- | --- |
| 0 — Environnement & outillage | Poste de développement, Git/GitHub, Node.js, PostgreSQL/PostGIS, Claude Code | Terminé |
| 1 — Analyse et cadrage | Contexte, objectifs, gouvernance, acteurs, scénarios utilisateurs | Validé |
| 2 — Conception | Spécifications fonctionnelles, modèle de données, cartographie, architecture technique, UI/UX, outil de collecte numérique | En cours |
| 3 — Développement | Sprints de développement (back-end, front-end, PWA) | À venir |
| 4 — Tests | Tests fonctionnels, performance, sécurité, recette utilisateur | À venir |
| 5 — Déploiement et maintenance | Mise en production, formation, plan de maintenance | À venir |

---

## Journal des décisions

*(chronologique — ne pas supprimer d'entrées ; une décision ancienne reste valable tant qu'elle n'est pas explicitement remplacée par une entrée plus récente)*

1. **Stack back-end arrêtée : Node.js / Express.** L'alternative Django, envisagée en v2.1, est écartée.
2. **Hébergement : VPS en contrôle total + Docker.** Pas de plateforme managée (type PaaS). Narcisse débute en administration serveur — prévoir un accompagnement renforcé sur cette partie en phase 5.
3. **Règle d'architecture non négociable — extensibilité multi-villes :** l'ajout d'une bibliothèque dans une nouvelle ville (au-delà de N'Djaména) doit se faire **par insertion de données/configuration, jamais par modification du code source**. Concrètement : tables `VILLE` et `SUBDIVISION_ADMINISTRATIVE` pilotées en base, pas d'énumération figée dans le code (voir Phase 2, modèle de données révisé).
4. **Environnement de développement opérationnel :** WSL2 + Ubuntu, Git configuré avec authentification SSH vers GitHub, Node.js v24 (LTS, via nvm), PostgreSQL 18 + extension PostGIS installés, base `bibliotheques_tchad` créée.
5. **Développement confié à Claude Code**, avec accès direct au PC de Narcisse et à son dépôt GitHub, agissant comme développeur senior. Pilotage prévu via **Claude Desktop** (onglet Code) plutôt qu'en ligne de commande pure, pour plus de lisibilité au quotidien.
6. **Collecte terrain — état des lieux :** le questionnaire papier (15 sections, A à O) est déjà rempli pour les bibliothèques de N'Djaména, **sans coordonnées GPS**. La digitalisation de ces réponses et le relevé GPS manquant se font via un formulaire **KoboToolbox** dédié.
7. **XLSForm de collecte conçu et déployé sur KoboToolbox**, avec :
   - un identifiant unique `bibliotheque_id` en tête de formulaire, pour relier chaque soumission à la fiche papier sans ambiguïté ;
   - des groupes de questions nommés selon les tables cibles (`group_localisation`, `group_horaires`, etc.), pour un import direct vers le schéma relationnel ;
   - la précision GPS **forcée à 10 mètres maximum** via la colonne `body::accuracyThreshold` (KoboCollect empêche la validation du point tant que ce seuil n'est pas atteint) ;
   - une photo de la façade obligatoire, prise au même moment que le point GPS, pour vérification croisée ;
   - un champ **Ville** (liste extensible, actuellement les chefs-lieux de région + villes secondaires du Tchad) suivi d'un champ **Arrondissement** affiché uniquement si `ville = N'Djaména`, et d'un champ texte libre **Subdivision administrative** pour toutes les autres villes (dont le découpage diffère et n'est pas toujours formalisé).
8. **Gestion des images :** au-delà de l'import initial depuis KoboToolbox, l'administrateur doit pouvoir ajouter, remplacer ou détacher une image directement depuis le tableau de bord de la plateforme, fiche par fiche — filet de sécurité en cas de mauvaise association lors de l'import automatique.

---

# PHASE 0 — Environnement de développement et outillage
**Statut : Terminé**

### 0.1 Poste de développement
PC portable Windows 10 (AMD Ryzen 5 3500U, 8 Go RAM, SSD) équipé de WSL2 (Ubuntu), retenu pour sa proximité avec l'environnement Linux du futur serveur de production.

### 0.2 Outils installés
| Outil | Rôle | Statut |
| --- | --- | --- |
| Git + clé SSH | Gestion de versions, connexion à GitHub | |
| Node.js v24 (LTS, via nvm) | Exécution du back-end JavaScript | |
| PostgreSQL 18 + PostGIS | Base de données relationnelle et géospatiale | |
| Base `bibliotheques_tchad` | Base de travail créée, extension PostGIS activée | |
| Claude Code (via Claude Desktop) | Développement assisté, accès direct au dépôt | configuré |

### 0.3 Fichier `CLAUDE.md` (racine du dépôt)
Document de contexte relu par Claude Code à chaque session. Doit contenir a minima : la stack retenue (Phase 2), la règle d'extensibilité multi-villes (Journal des décisions, point 3), la structure des dossiers du dépôt, et les commandes de lancement/test du projet.

### 0.4 Dépôt Git
Un dépôt GitHub doit être créé (ou l'est déjà) avec au minimum : `backend/`, `frontend/`, `docs/` (contenant ce cahier des charges), `CLAUDE.md`, `.env.example`, `.gitignore`.

---

# PHASE 1 — Analyse et cadrage
**Statut : Validé**

## 1. Contexte

L'accès à l'information documentaire et aux espaces de lecture constitue un enjeu majeur pour les élèves, étudiants, chercheurs, enseignants et citoyens du Tchad. Un grand nombre d'entre eux ignorent l'existence des bibliothèques disponibles dans leur ville, leur localisation exacte, leurs horaires d'ouverture, leurs conditions d'accès et les services qu'elles proposent.

Une première cartographie de terrain a déjà été engagée à N'Djaména, avec le déploiement d'un formulaire de collecte de données structuré (15 sections), en coordination avec plusieurs partenaires institutionnels, dont l'Ambassade des États-Unis et l'Ambassade de France.

### 1.1 Problématique
Comment permettre aux citoyens tchadiens d'identifier rapidement une bibliothèque adaptée à leurs besoins, d'en connaître les conditions d'accès réelles et de s'y rendre facilement, tout en offrant aux bibliothèques elles-mêmes un espace de visibilité et aux pouvoirs publics un outil de pilotage de l'écosystème documentaire national ?

### 1.2 Porteur du projet et gouvernance
Le projet est porté par Sayba et mis en œuvre par l'équipe Eureka+.

## 2. Objectifs du projet

### 2.1 Objectif général
Mettre en place une plateforme numérique permettant de recenser, valoriser et faciliter l'accès aux bibliothèques du Tchad, en commençant par une phase pilote à N'Djaména, **conçue dès l'origine pour une extension à d'autres villes sans modification du code** (voir Journal des décisions, point 3).

### 2.2 Objectifs spécifiques
- Constituer une base de données fiable et structurée des bibliothèques, alimentée par la collecte terrain et par les responsables de bibliothèques ;
- Permettre à tout utilisateur de localiser une bibliothèque à proximité et d'obtenir un itinéraire fiable pour s'y rendre ;
- Fournir des informations fiables, complètes et régulièrement actualisées sur chaque bibliothèque ;
- Encourager la fréquentation des espaces de lecture en réduisant les freins liés au manque d'information ;
- Renforcer la visibilité des bibliothèques auprès du public et des partenaires potentiels ;
- Outiller les institutions et bailleurs d'un tableau de bord national pour orienter leurs appuis.

### 2.3 Indicateurs de performance à 12 mois après le lancement
| Indicateur | Cible à 12 mois | Source de mesure |
| --- | --- | --- |
| Bibliothèques enregistrées et validées | 200 fiches | Base de données — statut « validé » |
| Taux de fiches complètes | ≥ 90 % | Tableau de bord administrateur |
| Utilisateurs uniques mensuels | 10 000 | Outil d'analyse d'audience |
| Temps de réponse moyen d'une recherche | < 3 secondes (réseau 3G) | Supervision technique / tests de charge |
| Bibliothèques mises à jour dans les 6 derniers mois | ≥ 70 % | Base de données |
| Délai moyen de validation d'une proposition | < 5 jours ouvrés | Journal des validations |
| Taux de disponibilité de la plateforme | ≥ 99 % | Supervision / monitoring |

## 3. Gouvernance et parties prenantes

| Question | Réponse de principe | À formaliser |
| --- | --- | --- |
| Qui possède la plateforme ? | Le Club scientifique Eureka+, jusqu'à un éventuel transfert institutionnel. | Convention de propriété intellectuelle |
| Qui finance l'hébergement ? | Phase pilote : financement propre / appui de partenaires. | Budget annuel (Phase 5) |
| Qui assure la maintenance ? | Équipe technique restreinte (développeur back-end + administrateur système). | Plan de maintenance (Phase 5) |
| Quelle institution porte le projet ? | Portage associatif (Eureka+), ancrage institutionnel recherché à moyen terme. | Comité de pilotage |
| Qui valide le contenu publié ? | Un administrateur désigné, selon le cycle de validation (Phase 2, §6.5). | Charte éditoriale |

## 4. Acteurs et cas d'utilisation

### 4.1 Matrice des rôles et permissions
Créer (C), Lire (L), Modifier/proposer (M), Valider (V), Supprimer (S).

| Action | Visiteur | Étudiant/Chercheur | Responsable bibliothèque | Enquêteur terrain | Administrateur |
| --- | --- | --- | --- | --- | --- |
| Consulter une fiche | L | L | L | L | L |
| Rechercher/filtrer/localiser | L | L | L | L | L |
| Créer une fiche | — | — | C (si non existante) | C | C |
| Proposer une modification | — | — | M | M | M |
| Valider/rejeter | — | — | — | — | V |
| Publier une activité culturelle | — | — | C | — | C |
| Laisser/modérer un avis | C | C | L | — | V/S |
| Gérer les comptes utilisateurs | — | — | — | — | C/M/S |
| Exporter des statistiques | — | — | L (sa fiche) | — | L (national) |

## 5. Scénarios utilisateurs

### Scénario 1 — Étudiant
Trouver rapidement une bibliothèque proche et connaître ses horaires.
**Étapes :** ouverture app → autorisation GPS → « Bibliothèques proches » → liste + carte dans un rayon de 5 km, triées par distance → consultation horaires du jour → itinéraire.
**Acceptation :** saisie manuelle possible si GPS refusé · résultat < 3 s en 3G · statut ouvert/fermé affiché clairement.

### Scénario 2 — Responsable de bibliothèque
Mettre à jour les horaires après un changement.
**Étapes :** connexion espace dédié → fiche → section Horaires → modification → enregistrement → file d'attente de validation → notification de décision.
**Acceptation :** fiche publique inchangée tant que non validée · historique consultable par l'admin · délai moyen < 5 jours ouvrés.

### Scénario 3 — Enquêteur terrain
Saisir une nouvelle fiche sur le terrain, y compris hors-ligne.
**Étapes :** mode hors-ligne → formulaire structuré (sections A à O) → capture GPS + photos → stockage local → synchronisation à la reconnexion → soumission pour validation.
**Acceptation :** aucune perte de données en cas de coupure · pas de doublons à la synchronisation · champs obligatoires identiques au formulaire terrain.

### Scénario 4 — Administrateur plateforme
Valider les nouvelles fiches et modifications avant publication.
**Étapes :** tableau de bord « Fiches en attente » → vérification (GPS, doublons, complétude) → validation/rejet motivé/renvoi → publication si validé.
**Acceptation :** doublons probables signalés automatiquement (nom proche + localisation proche) · motif obligatoire en cas de rejet · action horodatée et tracée.

### Scénario 5 — Citoyen à connexion instable
Consulter les informations essentielles avec une connexion faible.
**Étapes :** ouverture sur téléphone d'entrée de gamme → chargement allégé (texte prioritaire, images différées) → consultation d'une fiche déjà en cache.
**Acceptation :** page d'accueil < 1 Mo en première visite · fiches déjà consultées accessibles hors-ligne (PWA) · interface utilisable dès 4,5 pouces / Android 8+.

### Scénario 6 — Partenaire ou bailleur
Identifier les bibliothèques ayant le plus besoin d'un appui.
**Étapes :** connexion espace statistique → filtre par besoin prioritaire déclaré (section O) → export avec coordonnées de contact.
**Acceptation :** filtres alignés sur les catégories collectées sur le terrain · export CSV et PDF disponibles.

---

# PHASE 2 — Conception
**Statut : En cours** *(collecte numérique en cours de finalisation via KoboToolbox ; modèle de données à finaliser avec Claude Code avant le début du développement)*

## 6. Spécifications fonctionnelles détaillées

Priorités selon la méthode MoSCoW (Must have, Should have, Could have).

### 6.1 Recherche de bibliothèques — *Must have*
Recherche par nom, quartier, ville ; filtres cumulables (distance, type, horaires, services, gratuité) ; seules les fiches « validé » apparaissent.
**Acceptation :** résultat < 3 s en 3G · suggestion si résultat vide · tri par pertinence puis distance.

### 6.2 Carte interactive et géolocalisation — *Must have*
Clustering des marqueurs proches ; pré-fiche au clic (nom, type, distance, statut) ; itinéraire interne ou renvoi vers appli externe (Google Maps, OsmAnd) ; saisie manuelle du point de départ si GPS absent.
**Acceptation :** fluide avec 200 bibliothèques affichées · précision GPS enregistrée ≥ 10 m (voir §8) · mode liste en repli si la carte ne charge pas.

### 6.3 Fiche détaillée d'une bibliothèque — *Must have*
Blocs : identification, localisation, horaires, accès, prêt/consultation, public/fréquentation, collections, catalogue, services, activités, infrastructures, communication, besoins/partenariats. Champs non renseignés masqués, pas affichés vides. Date de dernière mise à jour visible. Contact direct mis en avant si disponible et publiable.
**Acceptation :** correspondance intégrale avec le formulaire terrain (Annexe A) · consultable hors-ligne si déjà visitée · signalement d'erreur possible par l'usager.

### 6.4 Création et proposition de fiche — *Must have*
Formulaire structurellement identique au formulaire terrain (15 sections). Saisie possible hors-ligne. Statut « en attente de validation » avant publication.
**Acceptation :** aucune perte de saisie en cas de coupure · alerte si fiche quasi-identique existante · confirmation + notification de décision au contributeur.

### 6.5 Cycle de validation des données — *Must have*
Circuit : Contributeur → proposition → file de validation → administrateur → contrôle de cohérence → validation/rejet motivé → publication. Contrôle automatique des doublons, GPS hors zone, champs obligatoires manquants. Fiches non mises à jour depuis 12 mois signalées pour vérification.
**Acceptation :** délai moyen < 5 jours ouvrés · décisions horodatées et attribuées · statut consultable par le contributeur.

### 6.6 Avis et notation — *Should have*
Avis soumis « en attente de modération ». Un avis actif par utilisateur et par bibliothèque. Réponse publique possible du responsable. Masquage automatique si signalé par plusieurs usagers.

### 6.7 Statistiques et tableau de bord — *Should have*
Admin : fiches par statut/type/ville ; fréquentation plateforme ; délais de validation ; besoins prioritaires agrégés. Responsable : statistiques de sa fiche uniquement. Partenaires : vue filtrable par besoin, export CSV/PDF.
**Acceptation :** indicateurs §2.3 calculables sans extraction manuelle · exports respectueux de la confidentialité (pas de coordonnées sans consentement, cf. §A5).

### 6.8 Gestion des utilisateurs et des rôles — *Must have*
Rôles : visiteur, responsable de bibliothèque, enquêteur terrain, administrateur. Vérification manuelle possible pour un compte responsable. Suspension possible avec conservation d'historique.
**Acceptation :** mots de passe hachés (jamais en clair) · actions sensibles tracées avec identifiant admin.

### 6.9 Mode hors-ligne et faible connectivité — *Must have*
PWA : cache des fiches déjà consultées, saisie terrain intégralement hors-ligne avec synchronisation différée, images en lazy loading et compressées, mode texte allégé activable.
**Acceptation :** page d'accueil < 1 Mo au premier chargement · fonctionnel sur Android 8+ / 2 Go RAM.

### 6.10 Gestion des images par l'administrateur — *Must have* *(ajout Phase 2)*
En complément de l'import initial depuis KoboToolbox, l'administrateur doit pouvoir, depuis le tableau de bord et fiche par fiche : ajouter une image, la remplacer, ou la détacher — sans passer par le code ni par un nouvel import.
**Acceptation :** une image ajoutée manuellement apparaît immédiatement sur la fiche publique après validation · aucune perte des images déjà importées lors d'une modification manuelle.

## 7. Modèle de données

### 7.1 Vue d'ensemble
Modèle relationnel de 15 entités alignées sur le formulaire de collecte terrain, plus les entités transverses (comptes, avis, images, historique) et **deux tables ajoutées pour l'extensibilité multi-villes** (voir Journal des décisions, point 3) :

- **VILLE** — pilote la liste des villes couvertes par la plateforme, sans code en dur.
- **SUBDIVISION_ADMINISTRATIVE** — pilote le découpage propre à chaque ville (arrondissements pour N'Djaména, autre découpage ou aucun pour les autres villes), rattachée à `VILLE` par clé étrangère.

### 7.2 Dictionnaire de données

#### VILLE *(nouvelle table)*
| Champ | Type | Description |
| --- | --- | --- |
| id | UUID (PK) | Identifiant unique |
| nom | Texte | Nom de la ville |
| statut | Énumération | active / pilote / désactivée |
| centre_lat / centre_long | Décimal | Centre de carte par défaut à l'ouverture sur cette ville |
| zoom_defaut | Entier | Niveau de zoom par défaut |

#### SUBDIVISION_ADMINISTRATIVE *(nouvelle table)*
| Champ | Type | Description |
| --- | --- | --- |
| id | UUID (PK) | Identifiant unique |
| ville_id | UUID (FK VILLE) | Ville de rattachement |
| nom | Texte | Ex. « 3e arrondissement », ou nom du canton/quartier propre à la ville |
| type | Énumération | arrondissement / canton / quartier / autre |

#### UTILISATEUR *(transverse)*
| Champ | Type | Description |
| --- | --- | --- |
| id | UUID (PK) | Identifiant unique |
| nom | Texte | Nom complet |
| email | Texte | Adresse email, unique |
| telephone | Texte | Numéro de contact |
| mot_de_passe_hash | Texte | Mot de passe haché |
| role | Énumération | visiteur / responsable_bibliotheque / enqueteur / administrateur |
| statut | Énumération | actif / suspendu / en_attente_verification |
| date_creation | Date | Date de création du compte |

#### BIBLIOTHEQUE (sections A et B)
| Champ | Type | Description |
| --- | --- | --- |
| id | UUID (PK) | Identifiant unique |
| nom_officiel | Texte | B1 |
| nom_alternatif | Texte | B2 |
| type | Énumération | B3 |
| annee_creation | Entier | B4 |
| responsable_institution | Texte | B5 |
| statut_fonctionnement | Énumération | B6 |
| raison_non_fonctionnel | Texte | B6 |
| statut_validation | Énumération | brouillon / en_attente / validé / rejeté |
| cree_par_id / valide_par_id | UUID (FK UTILISATEUR) | Traçabilité |
| date_creation / date_maj | Date | Traçabilité temporelle |
| enquete_repondant_nom, fonction, contact | Texte | A1–A4 |
| consentement_utilisation | Booléen | A5 |

#### LOCALISATION (section C) — *révisée pour l'extensibilité*
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| ville_id | UUID (FK VILLE) | Remplace le champ texte « ville » de la v2.1 |
| subdivision_id | UUID (FK SUBDIVISION_ADMINISTRATIVE, nullable) | Remplace l'énumération figée « arrondissement 1er à 10e » |
| quartier | Texte | C1 |
| point_repere | Texte | C2 |
| latitude / longitude | Décimal | C3 |
| precision_gps_m | Décimal | Précision de la mesure GPS — doit être ≤ 10 m (voir §8.1 et collecte KoboToolbox) |

#### HORAIRES (section D)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| jour | Énumération | D1 |
| heure_ouverture / heure_fermeture | Heure | D2, D3 |
| horaires_variables | Booléen | D4 |
| ouvert_vacances | Énumération oui/non/parfois | D5 |
| periodes_fermeture | Texte | D6 |

#### CONDITIONS_ACCES (section E)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| acces_gratuit | Énumération oui/non/partiel | E1 |
| montant_par_visite | Décimal (FCFA) | E1 |
| abonnement_mensuel/trimestriel/annuel | Décimal (FCFA) | E2 |
| conditions_inscription | Liste | E3 |
| consultation_sans_inscription | Énumération | E4 |
| conditions_eleves_etudiants | Texte | E5 |
| acces_personnes_exterieures | Énumération | E6 |
| modes_paiement | Liste | E7 |

#### PRET_CONSULTATION (section F)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| lecture_sur_place | Booléen | F1 |
| emprunt_domicile | Énumération | F2 |
| nb_max_livres_empruntables | Entier | F2 |
| duree_max_pret | Texte | F2 |
| penalites_retard | Texte | F3 |
| systeme_suivi_prets | Énumération | F4 |
| livres_exclus_pret | Texte | F5 |
| action_si_non_retour | Texte | F6 |

#### PUBLIC_FREQUENTATION (section G)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| public_cible | Liste | G1 |
| frequentation_moyenne_jour/semaine | Entier | G2, G3 |
| moments_forte_frequentation | Liste | G4 |
| outil_suivi_frequentation | Énumération | G5 |
| motifs_frequentation | Liste | G6 |
| freins_frequentation_jeunes | Liste | G7 |
| accessible_handicap | Énumération | G8 |

#### COLLECTION et CATALOGUE (sections H et I)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| nb_livres_estime | Entier | H1 |
| source_du_nombre | Énumération | H2 |
| mode_classement | Liste | H3 |
| domaines_couverts/domaine_principal | Liste/Texte | H4, H5 |
| types_ouvrages | Liste | H6 |
| langues_disponibles | Liste | H7 |
| etat_des_livres | Énumération | H8 |
| accepte_dons | Énumération | H9 |
| besoins_prioritaires_livres | Texte | H10 |
| dispose_catalogue/format_catalogue/mise_a_jour | Booléen/Énumération | I1 |
| logiciel_gestion | Texte | I2 |

#### SERVICES (section J)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| salle_lecture/nb_places | Booléen/Entier | J1 |
| espaces_disponibles | Liste | J2 |
| accompagnement_recherche | Énumération | J3 |
| wifi_gratuit/wifi_payant | Booléen | J4 |
| ordinateurs_libre_acces/nb_ordinateurs | Booléen/Entier | J4 |
| imprimante/photocopieur/scanner | Booléen | J4 |
| autres_services | Texte | J5 |

#### ACTIVITE (section K)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| organise_activites | Booléen | K1 |
| types_activites | Liste | K2 |
| frequence | Énumération | K3 |
| public_participant | Liste | K4 |
| gratuites | Énumération | K5 |
| besoins_organisation | Liste | K6 |
| date, description | Date/Texte | Instance d'activité publiée |

#### INFRASTRUCTURE (section M) et COMMUNICATION (section N)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| problemes_materiels | Liste | M1 |
| besoin_rehabilitation/types_travaux | Énumération/Texte | M2 |
| canaux_decouverte | Liste | N1 |
| site_web | Texte | N2 |
| reseaux_sociaux | Liste | N3 |
| whatsapp_public/email_public | Texte | N4, N5 |
| interesse_fiche_numerique | Énumération | N6 |

#### BESOINS_PARTENARIATS (section O)
| Champ | Type | Description |
| --- | --- | --- |
| id / bibliotheque_id | UUID (PK/FK) | |
| defis_principaux | Texte | O1 |
| types_appui_necessaire | Liste | O2 |
| appui_prioritaire | Texte | O3 |
| a_deja_recu_appui/partenaire_precedent | Booléen/Texte | O4 |
| recherche_partenaires | Booléen | O5 |
| type_partenariat_souhaite | Liste | O6 |

#### Entités transverses
| Table | Champs clés | Rôle |
| --- | --- | --- |
| IMAGE | id, bibliotheque_id (FK), type (photo/logo/document), url, date_ajout, ajoutee_par_id (FK) | Photos, logo et documents ; gérable manuellement par l'admin (§6.10) |
| AVIS | id, bibliotheque_id (FK), utilisateur_id (FK), note, commentaire, statut_moderation | Avis et notation des usagers |
| HISTORIQUE_MODIFICATION | id, bibliotheque_id (FK), champ_modifie, ancienne/nouvelle_valeur, modifie_par_id (FK), statut, date | Traçabilité des propositions et décisions |
| ENQUETE | id, bibliotheque_id (FK), nom_enqueteur, date_collecte, mode_collecte | Métadonnées de la collecte terrain d'origine |

## 8. Cartographie et géolocalisation

### 8.1 Précision GPS requise
Précision minimale : 10 mètres. **Mécanisme technique retenu :** dans le formulaire KoboToolbox, la colonne `body::accuracyThreshold = 10` empêche l'enquêteur de valider un point tant que la précision affichée n'atteint pas ce seuil — la contrainte est donc posée dès la collecte, pas seulement vérifiée a posteriori en base. Un point dont la précision dépasse malgré tout 30 m (import de données anciennes, saisie manuelle) est signalé pour vérification. En cas d'impossibilité de captation fiable, positionnement manuel du marqueur sur la carte en s'appuyant sur le point de repère (C2).

### 8.2 Choix technologique : OpenStreetMap plutôt que Google Maps
Retenu pour l'absence de coûts récurrents liés au volume d'appels, la possibilité de mise en cache locale des tuiles, et l'autonomie vis-à-vis des quotas commerciaux. Connecteur optionnel vers Google Maps pour la génération d'itinéraires externes, au choix de l'utilisateur.

### 8.3 Fonctionnement en l'absence de GPS ou de connexion
Recherche manuelle par quartier, subdivision ou ville en l'absence de géolocalisation. Tuiles de la zone déjà consultée mises en cache. Mode liste en repli permanent si la carte ne charge pas.

## 9. Exigences non fonctionnelles

### 9.1 Performance
Recherche/affichage < 3 s en 3G · page d'accueil < 1 Mo · au moins 500 bibliothèques affichées sans dégradation (clustering).

### 9.2 Accessibilité mobile et faible bande passante
Responsive mobile-first · compatibilité Android 8+ et navigateurs mobiles courants · PWA installable, fonctionnement hors-ligne partiel · images optimisées systématiquement.

### 9.3 Sécurité
Authentification par mot de passe haché + JWT à durée limitée · HTTPS/TLS sur toute la plateforme · droits par rôle contrôlés côté serveur (pas seulement côté interface) · consentement explicite avant publication de coordonnées personnelles · sauvegardes quotidiennes automatisées, 30 jours d'historique minimum · journalisation non modifiable des actions sensibles.

### 9.4 Disponibilité
Objectif 99 % mensuel · supervision technique de base dès la mise en production.

### 9.5 Extensibilité multi-villes *(élevée au rang d'exigence non fonctionnelle — ancien point de la section « Évolutions futures » de la v2.1)*
- Ajouter une ville ne doit nécessiter **aucune modification, recompilation ou redéploiement du code** — uniquement une insertion dans les tables `VILLE` et `SUBDIVISION_ADMINISTRATIVE` (§7.2), éventuellement via une interface d'administration dédiée.
- Aucune valeur liée à une ville (nom d'arrondissement, centre de carte, zoom par défaut) ne doit être codée en dur dans le back-end ou le front-end.
- Un test de charge par ville pilote est recommandé avant l'ouverture officielle d'une nouvelle ville à la collecte et à la publication.

## 10. Architecture technique

### 10.2 Stack technique retenue *(mise à jour — décisions actées, voir Journal des décisions)*
| Couche | Choix retenu | Justification |
| --- | --- | --- |
| Front-end | React.js, en Progressive Web App | Écosystème riche, compatible mobile-first et hors-ligne |
| Back-end / API | **Node.js (Express)** — arrêté définitivement | Décision actée ; Django écarté |
| Base de données | PostgreSQL avec extension PostGIS | Requêtes géospatiales natives (proximité, distances) |
| Cartographie | OpenStreetMap + Leaflet | Pas de coûts récurrents liés au volume (§8.2) |
| Stockage fichiers | Stockage objets compatible S3, ou stockage local en phase pilote | Séparation du stockage image/document et de la base relationnelle |
| Hébergement | **VPS en contrôle total + Docker** — arrêté définitivement | Pas de plateforme managée ; accompagnement nécessaire (Narcisse débutant en administration serveur) |
| Intégration continue | Pipeline simple (tests + déploiement) dès la Phase 3 | Réduction des régressions à chaque mise à jour |

## 11. Interface utilisateur (UI/UX)

### 11.1 Principes d'ergonomie
Mobile-first · hiérarchie de l'information (statut, adresse, horaires du jour en tête) · sobriété visuelle et faible poids graphique · parcours de recherche en trois clics maximum.

### 11.2 Pages principales
| Page | Contenu attendu |
| --- | --- |
| Accueil | Recherche mise en avant · carte interactive · statistiques générales · bibliothèques/activités récentes |
| Résultats de recherche | Filtres · liste avec aperçu · bascule liste/carte |
| Fiche bibliothèque | Blocs détaillés (§6.3) · itinéraire et contact · avis/notation · activités à venir |
| Espace responsable de bibliothèque | Tableau de bord de la fiche · formulaire de modification (A à O) · statistiques · suivi des propositions |
| Espace enquêteur terrain | Formulaire complet hors-ligne · file de synchronisation |
| Tableau de bord administrateur | File de validation · gestion comptes/rôles · statistiques nationales · modération des avis · **gestion manuelle des images par fiche (§6.10)** · export de données |

### 11.3 Outil de collecte numérique (KoboToolbox)
La digitalisation des fiches papier et le relevé GPS manquant s'appuient sur un formulaire KoboToolbox dédié (XLSForm), structuré en miroir du modèle de données :
- Chaque groupe de questions Kobo porte le nom de la table cible (`group_bibliotheque`, `group_localisation`, `group_horaires`, etc.) — un script d'import peut donc mapper directement l'export Kobo vers les tables du schéma, sans transformation manuelle lourde.
- Le champ `bibliotheque_id`, présent en tête de chaque soumission, permet de relier sans ambiguïté chaque enregistrement numérique à sa fiche papier d'origine.
- La correspondance complète section du formulaire ↔ table de données reste celle de l'Annexe A.

---

# PHASE 3 — Développement
**Statut : À venir**

## 12. Plan de développement

### 12.1 Méthodologie
Phases 1 et 2 en logique séquentielle classique. Développement recommandé en sprints de 2 semaines, avec démonstration fonctionnelle à la fin de chaque sprint.

### 12.2 Phasage détaillé
| Sous-étape | Durée indicative | Livrables |
| --- | --- | --- |
| Sprint 1-2 | — | Authentification, gestion des fiches, modèle de données (y compris VILLE/SUBDIVISION_ADMINISTRATIVE) |
| Sprint 3-4 | — | Recherche, carte interactive, fiche détaillée |
| Sprint 5 | — | Cycle de validation, tableau de bord administrateur, gestion manuelle des images |
| Sprint 6 | — | Mode hors-ligne (PWA), avis, statistiques |

## 13. Équipe et ressources humaines
| Rôle | Responsabilité principale | Engagement estimé |
| --- | --- | --- |
| Chef de projet | Coordination générale, suivi du planning | Transverse |
| Développeur back-end / front-end | API, base de données, interfaces, PWA | **Assuré par Claude Code**, phases 2 à 5 |
| Designer UI/UX | Maquettes, ergonomie mobile-first | Phase 2, ponctuel phase 3 |
| Administrateur système | Hébergement VPS/Docker, sauvegardes, supervision | Phase 5, puis en continu — accompagnement à prévoir |
| Responsable données/terrain | Qualité des données, coordination des enquêteurs, suivi KoboToolbox | Transverse |

### 13.1 Modalités de travail avec Claude Code
- Claude Code agit comme développeur senior, avec accès direct au dépôt GitHub et au poste de Narcisse.
- Chaque session s'appuie sur le fichier `CLAUDE.md` (Phase 0) pour le contexte technique et les règles d'architecture non négociables (Journal des décisions).
- Discipline de commit attendue : un commit par fonctionnalité stable, messages explicites, pas de code non testé poussé directement sur la branche principale.
- Toute proposition qui remettrait en cause une décision actée (Journal des décisions) doit être signalée explicitement à Narcisse avant mise en œuvre.

---

# PHASE 4 — Tests
**Statut : À venir**

| Volet | Contenu |
| --- | --- |
| Tests fonctionnels | L'ensemble des scénarios de la Phase 1 (§5) exécutables de bout en bout |
| Tests de performance | Charge, temps de réponse en 3G (cible < 3 s, §9.1) |
| Tests de sécurité de base | Authentification, contrôle des droits par rôle |
| Recette utilisateur | Panel de bibliothécaires et d'étudiants, sur environnement représentatif |
| Test spécifique extensibilité | Ajout d'une ville test uniquement par configuration/données, sans toucher au code (§9.5) |

---

# PHASE 5 — Déploiement et maintenance
**Statut : À venir**

## 14. Budget estimatif indicatif *(ordres de grandeur, en FCFA)*
| Poste | Estimation indicative | Nature |
| --- | --- | --- |
| Développement | Assuré par Claude Code + supervision Narcisse | — |
| Nom de domaine | 15 000 – 30 000 FCFA/an | Récurrente |
| Hébergement VPS + Docker | 150 000 – 400 000 FCFA/an selon trafic | Récurrente |
| Stockage objets | Inclus ou faible complément | Récurrente |
| Maintenance corrective/évolutive | À définir | Récurrente |
| Formation admin/responsables | Mutualisable avec les activités terrain | Ponctuelle |
| Communication et lancement | À définir selon partenaires | Ponctuelle |

## 15. Sécurité et confidentialité des données
- Informations personnelles des répondants (nom, téléphone, email — section A) utilisées uniquement dans le cadre du projet, conformément à l'engagement de confidentialité déjà signé.
- Seules les coordonnées explicitement autorisées pour publication (section N) apparaissent sur la fiche publique.
- Droit de rectification/retrait sur demande.
- Aucune cession, vente, ou usage commercial des données.

## 16. Plan de déploiement et de maintenance

### 16.1 Mise en production
Déploiement sur le VPS retenu, nom de domaine + certificat HTTPS · import des données déjà collectées (après vérification/nettoyage) · test de charge léger et test sur terminal d'entrée de gamme/3G · communication de lancement auprès des partenaires (U-Report Moursal 2, Eureka+, Nouveaux Horizons, CEFOD, ambassades).

### 16.2 Formation
Administrateurs (tableau de bord, cycle de validation) · responsables de bibliothèques (guide pratique) · enquêteurs terrain (saisie via l'application et via KoboToolbox).

### 16.3 Maintenance corrective et évolutive
| Type | Description | Fréquence/délai |
| --- | --- | --- |
| Corrective | Anomalies bloquantes | Sous 48h pour les cas critiques |
| Corrective mineure | Bugs non bloquants | Cycle mensuel |
| Évolutive | Nouvelles fonctionnalités, nouvelles villes (par configuration, §9.5) | Selon feuille de route |
| Technique | Sécurité, sauvegardes, supervision | Continue |

## 17. Livrables attendus
- Plateforme web fonctionnelle (PWA) déployée en production ;
- Code source documenté sur dépôt GitHub ;
- Documentation technique (architecture, modèle de données, procédure de déploiement) ;
- Manuel utilisateur par profil ;
- Base de données initiale peuplée (bibliothèques déjà cartographiées à N'Djaména) ;
- Le présent cahier des charges, tenu à jour comme référence contractuelle et fonctionnelle.

## 18. Critères de réussite et recette
- Tous les scénarios utilisateurs (Phase 1, §5) exécutables de bout en bout en production ;
- Critères d'acceptation de chaque spécification (Phase 2, §6) vérifiés en recette ;
- Exigences de performance et d'accessibilité mobile (§9) validées sur terminal représentatif et 3G ;
- Au moins 50 bibliothèques déjà cartographiées importées et visibles au lancement ;
- Cycle de validation opérationnel, testé avec au moins un cas de création et un cas de modification ;
- Ajout d'une ville test réalisé sans modification de code, validant l'exigence §9.5 ;
- Indicateurs à 12 mois (§2.3) suivis effectivement via le tableau de bord.

---

# Annexes

## Annexe A — Correspondance formulaire terrain / modèle de données / groupes KoboToolbox
| Section du formulaire | Table(s) de données | Groupe KoboToolbox |
| --- | --- | --- |
| A — Informations sur la collecte | BIBLIOTHEQUE (champs enquête), ENQUETE | group_repondant |
| B — Identification | BIBLIOTHEQUE | group_bibliotheque |
| C — Localisation géographique | LOCALISATION, VILLE, SUBDIVISION_ADMINISTRATIVE | group_localisation |
| D — Horaires d'ouverture | HORAIRES | group_horaires |
| E — Conditions d'accès | CONDITIONS_ACCES | group_acces |
| F — Consultation et prêt | PRET_CONSULTATION | group_pret |
| G — Public et fréquentation | PUBLIC_FREQUENTATION | group_frequentation |
| H — Collections | COLLECTION | group_collections |
| I — Catalogue | CATALOGUE | group_catalogue |
| J — Services | SERVICES | group_services |
| K — Activités | ACTIVITE | group_activites |
| M — Infrastructures | INFRASTRUCTURE | group_infrastructure |
| N — Communication | COMMUNICATION | group_communication |
| O — Besoins, partenariats | BESOINS_PARTENARIATS | group_besoins |

## Annexe B — Glossaire
| Terme | Définition |
| --- | --- |
| PWA (Progressive Web App) | Application web installable et partiellement utilisable hors-ligne |
| MoSCoW | Priorisation : Must have, Should have, Could have, Won't have |
| PostGIS | Extension PostgreSQL pour les données géographiques |
| Clustering (carte) | Regroupement visuel de marqueurs proches |
| Statut de validation | brouillon / en attente / validé / rejeté |
| RACI simplifié | Créer / Lire / Modifier / Valider / Supprimer |
| XLSForm | Format tableur standard pour concevoir un formulaire KoboToolbox/ODK |
| `body::accuracyThreshold` | Colonne XLSForm forçant une précision GPS minimale avant validation d'un point |
| VILLE / SUBDIVISION_ADMINISTRATIVE | Tables pilotant l'extensibilité multi-villes sans modification de code |

## Annexe C — Évolutions futures (hors périmètre pilote)
- Application mobile native (Android en priorité), au-delà de la PWA ;
- Module de réservation de places en salle de lecture ;
- Catalogue en ligne consultable pour les bibliothèques équipées (section I) ;
- Espace dédié aux bailleurs avec suivi longitudinal de l'impact de leurs appuis ;
- Système de messagerie interne entre usagers et bibliothèques.

*(Note : l'extension géographique à d'autres villes n'est plus listée ici — elle est désormais une exigence non fonctionnelle du cœur de l'application, §9.5, et non une évolution future.)*
