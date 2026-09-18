# SECURITY.md — Exigences de sécurité non négociables
## Projet « Bibliothèques du Tchad »

Ce document fixe les règles de sécurité que **tout code produit sur ce projet doit respecter**, sans exception ni négociation au cas par cas. Il complète `CLAUDE.md` et le cahier des charges (`docs/Cahier_des_charges_Bibliotheques_du_Tchad_v3_par_phases.md`).

**Principe directeur :** le risque principal n'est pas qu'une IA écrive du code malveillant, mais qu'elle produise du code fonctionnel et insuffisamment sécurisé si la sécurité n'est pas explicitement exigée à chaque étape. Ce document existe pour que ce ne soit jamais le cas ici.

**Pour Claude Code :** relire ce fichier avant toute tâche touchant l'authentification, la base de données, les uploads de fichiers, ou toute route exposée publiquement. Toute déviation par rapport à une règle ci-dessous doit être signalée explicitement à Narcisse avant d'être implémentée, jamais appliquée silencieusement « pour simplifier ».

---

## 1. Authentification et page de connexion

- [ ] Mots de passe hachés avec **bcrypt** (coût ≥ 12) ou **argon2** — jamais MD5, SHA1/256 seul, ni stockage en clair.
- [ ] **Limitation du taux de tentatives** sur la route de connexion (`express-rate-limit`) — ex. 5 tentatives / 15 min par IP et par compte.
- [ ] **Verrouillage temporaire** d'un compte après un nombre défini d'échecs consécutifs.
- [ ] Jetons **JWT à durée de vie courte** (15–30 minutes) avec mécanisme de rafraîchissement (`refresh token`), jamais un jeton à validité illimitée.
- [ ] Si sessions côté serveur : cookies `HttpOnly`, `Secure`, `SameSite=Strict`.
- [ ] Messages d'erreur de connexion **génériques** (« identifiants incorrects ») — ne jamais révéler si c'est l'email ou le mot de passe qui est faux (évite l'énumération de comptes).
- [ ] Politique de mot de passe minimale imposée à la création de compte (longueur ≥ 8, pas de mot de passe dans une liste de mots de passe compromis courants).

## 2. Protection de la base de données

- [ ] PostgreSQL **n'écoute jamais sur une interface publique** — uniquement en local ou sur le réseau interne Docker. Le pare-feu du VPS (`ufw`) n'autorise que les ports 80, 443 et SSH depuis l'extérieur.
- [ ] L'utilisateur PostgreSQL utilisé par l'application a des **droits minimaux** (lecture/écriture sur les tables nécessaires uniquement) — jamais `SUPERUSER`. Un compte séparé, à droits plus larges, sert uniquement aux migrations et n'est jamais utilisé par l'application en fonctionnement normal.
- [ ] **Toutes les requêtes SQL sont paramétrées** (`$1, $2...` avec le module `pg`, ou passent par un ORM tel que Prisma) — **aucune concaténation de chaîne de caractères dans une requête SQL, sans exception**. C'est le point à vérifier en priorité dans chaque diff touchant le back-end.
- [ ] Sauvegardes quotidiennes automatisées, chiffrées, avec au moins 30 jours d'historique (cf. cahier des charges §9.3) — et **testées régulièrement en restauration**, pas seulement générées.

## 3. Validation des entrées utilisateur

- [ ] Chaque endpoint de l'API valide ses entrées via un schéma explicite (`zod` ou `express-validator`) — type, longueur, format — **avant** tout traitement métier, pas seulement sur les champs visibles côté interface.
- [ ] La validation se fait **côté serveur systématiquement**, même si elle existe déjà côté client (le client peut toujours être contourné).
- [ ] Pour les uploads d'images (photos de bibliothèques) :
  - Vérification du **type MIME réel** du fichier (pas seulement l'extension déclarée).
  - Limite de taille stricte par fichier.
  - Renommage systématique du fichier à l'enregistrement (jamais conserver le nom fourni par l'utilisateur).
  - Stockage hors de tout répertoire exécutable par le serveur web.
- [ ] En-têtes de sécurité HTTP appliqués via `helmet` (protection XSS, clickjacking, MIME sniffing).
- [ ] `cors` configuré avec une **liste blanche explicite de domaines**, jamais `origin: '*'` en production.

## 4. Discipline de revue (spécifique au travail avec une IA)

- [ ] **Aucune validation automatique en mode « accepter tout »** pour un diff touchant : l'authentification, l'accès à la base de données, la gestion des fichiers, ou toute nouvelle route publique. Narcisse relit ces diffs, même sommairement, avant acceptation.
- [ ] Toute nouvelle route sensible (auth, écriture en base, upload) est accompagnée d'une explication écrite de ses choix de sécurité par Claude Code, avant validation.
- [ ] Des tests incluant des **tentatives d'attaque simples** (injection SQL basique, script `<script>` dans un champ texte) sont écrits pour prouver que la validation fonctionne — pas seulement des tests du chemin nominal.
- [ ] `npm audit` est exécuté après chaque ajout de dépendance ; toute vulnérabilité de sévérité haute ou critique est traitée avant de continuer.
- [ ] Une **passe de revue de sécurité dédiée** (pas noyée dans le développement de fonctionnalités) est prévue avant chaque déploiement en production — relecture de toutes les routes, formulaires et points d'upload.

## 5. Durcissement serveur (VPS)

- [ ] HTTPS obligatoire partout, certificat Let's Encrypt via reverse proxy (nginx), redirection forcée HTTP → HTTPS.
- [ ] Mises à jour système régulières (`apt update && apt upgrade`) — beaucoup de compromissions viennent d'un logiciel serveur obsolète, pas du code applicatif.
- [ ] Accès SSH par clé uniquement (pas de mot de passe), port SSH non standard recommandé.
- [ ] Aucun secret (mot de passe DB, clé JWT, clé API) en dur dans le code — uniquement via variables d'environnement (`.env`, listé dans `.gitignore`, jamais commité). `.env.example` documente les clés attendues sans valeurs réelles.

---

## Ce document dans le cycle de vie du projet

- Il est relu par Claude Code au même titre que `CLAUDE.md` avant toute tâche touchant les points ci-dessus.
- Il évolue si de nouvelles menaces ou de nouveaux composants l'exigent — toute modification est faite consciemment, jamais pour contourner une règle gênante.
- La case à cocher devant chaque règle sert de suivi d'implémentation au fil du développement (Phase 3 du cahier des charges) — à cocher au fur et à mesure, pas à l'avance.
