<!-- markdownlint-disable MD024 MD025 MD060 -->

# SailingLoc — Guide développeur

Plateforme de location de bateaux — projet fullstack avec un backend Node.js/Express et un frontend React/Vite.

---

## Sommaire

- [Identité visuelle](#identité-visuelle)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Paiements Stripe](#paiements-stripe)
- [Scripts disponibles](#scripts-disponibles)
- [Structure du projet](#structure-du-projet)
- [API](#api)
- [Choses à savoir](#choses-à-savoir)
- [Extension TODO Tree](#extension-todo-tree)
- [Workflow Git](#workflow-git)

---

## Identité visuelle

### Police

**Plus Jakarta Sans** — utilisée sur l'ensemble du projet (web et application mobile).

---

### Charte graphique

#### Couleurs

| Nom         | Hex       | Usage                          |
| ----------- | --------- | ------------------------------ |
| Blanc Nuage | `#EBF5FD` | Fonds clairs, surfaces, cartes |
| Bleu Ciel   | `#5AB4EC` | Accents, icônes, CTA           |
| Bleu Mer    | `#5AB4EC` | Couleur principale, CTA, liens |
| Bleu Océan  | `#0A3172` | Titres, headers, textes forts  |

#### Modes d'utilisation

| Mode                  | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| Mode sombre / Premium | Fond océan, textes et icônes en blanc nuage. Ambiance nocturne et haut de gamme.      |
| Mode été / Outdoor    | Bleu ciel dominant, blanc en négatif. Communication légère, affiches, réseaux.        |
| Mode clair / Digital  | Fond nuage, éléments en bleu mer et ciel. Idéal pour le web et l'application mobile.  |
| Tricolore marine      | Les trois bleus ensemble pour les supports institutionnels, pitch decks et brochures. |

---

### Assets / Logos

Les logos sont disponibles dans `frontend/src/assets/image/SL_logo/` :

| Fichier    | Description                                       |
| ---------- | ------------------------------------------------- |
| Logo long  | Logo avec le nom complet **SailingLoc** en entier |
| Logo court | Logo avec les initiales uniquement                |

---

## Technologies

### Frontend

| Technologie  | Version | Rôle                              |
| ------------ | ------- | --------------------------------- |
| React        | 18.x    | Interface utilisateur             |
| React Router | 6.x     | Routage côté client               |
| Vite         | 5.x     | Serveur de développement et build |
| TailwindCSS  | 3.x     | Styles utilitaires                |
| Axios        | 1.x     | Requêtes HTTP vers l'API          |
| FullCalendar | 6.x     | Calendrier interactif             |

### Backend

| Technologie | Version | Rôle                          |
| ----------- | ------- | ----------------------------- |
| Node.js     | 20.x    | Environnement d'exécution     |
| Express.js  | 4.x     | Framework web                 |
| Prisma ORM  | 5.x     | Accès base de données         |
| PostgreSQL  | 16.x    | Base de données relationnelle |
| JWT         | 9.x     | Authentification par token    |
| Bcrypt      | 5.x     | Hachage des mots de passe     |
| Stripe SDK  | 14.x    | Paiements en ligne            |
| Multer      | 1.x     | Upload de fichiers            |
| Nodemailer  | 6.x     | Envoi d'emails                |

---

## Prérequis

- **Docker** v24+ et **Docker Compose** v2+ (méthode recommandée)
- **ou** Node.js v20+ et PostgreSQL v16+ (méthode locale)
- **Git** configuré avec vos identifiants
- **VS Code** avec l'extension **Todo Tree** (voir [section dédiée](#extension-todo-tree))

---

## Installation

### Méthode recommandée : Docker

```bash
git clone <url-du-repo>
cd SailingLoc_G2
docker-compose -f docker-compose.dev.yml up --build
```

Cela démarre automatiquement :

- le frontend sur [http://localhost:5173](http://localhost:5173)
- le backend sur [http://localhost:4000](http://localhost:4000)
- PostgreSQL sur le port `5433`
- **MailDev** (interface web emails) sur [http://localhost:1080](http://localhost:1080)
- **Matomo** (mesure d'audience) sur [http://localhost:8081](http://localhost:8081) — avec sa base MariaDB dédiée (interne, non exposée)

> Les emails d'inscription/vérification sont interceptés par MailDev — aucun vrai email n'est envoyé. Ouvrez [http://localhost:1080](http://localhost:1080) pour les consulter.

#### Premier lancement de Matomo (une seule fois)

1. Ouvrir [http://localhost:8081](http://localhost:8081) — l'assistant d'installation se lance (la connexion à la base est pré-remplie via les variables `MATOMO_*` du `.env` racine)
2. Créer le compte **super-admin** (identifiants personnels, à retenir)
3. Déclarer le site : nom **SailingLoc**, URL **http://localhost:5173** — il doit recevoir l'**id 1** (attendu par `frontend/src/utils/matomo.js`)
4. Ignorer l'écran « code de tracking » : le script est injecté par le frontend, uniquement après consentement (voir [Cookies & consentement](#cookies--consentement-cnil--matomo))
5. Conformité CNIL : dans **Administration → Confidentialité**, activer l'anonymisation des IP et régler la suppression des anciennes données à **25 mois**

Pour arrêter :

```bash
docker-compose -f docker-compose.dev.yml down
```

---

### Méthode locale (sans Docker)

#### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd SailingLoc_G2
```

#### 2. Installer les dépendances

```bash
# À la racine
npm install

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

#### 3. Configurer les variables d'environnement

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../frontend
cp .env.example .env
```

> **En Docker**, c'est le `.env` **racine** qui compte (copié depuis `.env.example` racine) : Docker Compose y lit toutes les variables et elles ont priorité sur les `.env` locaux.

En production, le backend refuse de démarrer si `JWT_SECRET`, `DATABASE_URL`,
`FILE_ENCRYPTION_KEY`, `APP_URL` HTTPS, les deux secrets Stripe live et une
configuration email valide ne sont pas fournis. Le seed de démonstration est
réservé aux environnements de développement et de test.

`CORS_ORIGINS` est optionnelle : elle contient, séparées par des virgules, les
origines frontend supplémentaires autorisées à envoyer les cookies de session.
`APP_URL` est toujours autorisée et les origines staging/production doivent
être en HTTPS. PostgreSQL et Redis ne sont pas publiés par les compose de
staging/production ; le Redis de production exige `REDIS_PASSWORD` (il échoue
volontairement au démarrage si elle est absente). Les volumes privés
`storage/documents` et `storage/disputes` sont persistants et ne sont jamais
servis par nginx.

Variables backend à renseigner dans `backend/.env` :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sailingloc
JWT_SECRET=                         # générer une valeur aléatoire locale (32 caractères minimum)
STRIPE_SECRET_KEY=sk_test_...        # voir section Paiements Stripe
STRIPE_WEBHOOK_SECRET=whsec_...      # voir section Paiements Stripe
FILE_ENCRYPTION_KEY=                 # openssl rand -hex 32
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=
EMAIL_PASS=
PORT=4000
```

Variable frontend à renseigner dans `frontend/.env` :

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...   # voir section Paiements Stripe
# Optionnel — mesure d'audience Matomo (nécessite Docker, voir note ci-dessous).
# Sans cette variable, le tracking est simplement désactivé : le site fonctionne normalement.
# VITE_MATOMO_URL=http://localhost:8081
```

L'image frontend de staging/production écoute sur le port interne `8080` avec
un utilisateur nginx non privilégié (les compose publient respectivement
`5174:8080` et `3000:8080`). Le déploiement Railway utilise cette image Docker
et nginx afin que les headers de sécurité soient réellement appliqués. Le CSP
autorise uniquement les services réellement utilisés : Stripe, Google Fonts,
les tuiles Carto/Leaflet, Nominatim, les images seed Unsplash/Pexels/RandomUser
et l'instance Matomo déclarée `analytics.sailingloc.fr`.

`VITE_API_BASE_URL` est une variable publique, mais elle est figée dans le
bundle Vite au moment du build. Elle est donc obligatoire pour les builds
Docker/Railway de staging et de production et doit être une URL API HTTPS
publique (par exemple `https://api.sailingloc.fr/api`), jamais `localhost`.
Dans Railway, configurez le service frontend avec le root directory
`/frontend`, le fichier de configuration `/frontend/railway.json`, et cette
variable dans le service avant le premier déploiement. Les variables publiques
`VITE_MATOMO_URL` et `VITE_STRIPE_PUBLISHABLE_KEY` doivent également être
définies avant le build si ces intégrations sont activées.

> **Matomo sans Docker ?** Matomo (PHP + MariaDB) n'est pas fourni en méthode locale — l'installer à la main est lourd et inutile pour développer. Deux options : ne rien faire (recommandé — sans `VITE_MATOMO_URL`, le code de tracking est un no-op silencieux), ou lancer uniquement les deux conteneurs Matomo si Docker est disponible : `docker compose -f docker-compose.dev.yml up -d matomo matomo_db`.

#### 4. Lancer MailDev (intercepteur d'emails local)

Dans un terminal dédié :

```bash
npx maildev
```

MailDev démarre un serveur SMTP sur le port `1025` et une interface web sur [http://localhost:1080](http://localhost:1080).
Tous les emails envoyés par l'application y sont interceptés — aucun vrai email n'est expédié.

> **Alternative** : installation globale avec `npm install -g maildev` puis `maildev`.

#### 5. Initialiser la base de données

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
# Optionnel : données de test
npx prisma db seed
```

#### 6. Lancer les serveurs

Dans deux terminaux séparés :

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

---

## Comptes de test

Une fois les containers lancés, vous pouvez vous connecter avec les comptes suivants :

### Compte Administrateur

| Email                 | Mot de passe                    |
| --------------------- | ------------------------------- |
| `admin@sailingloc.fr` | configuré localement uniquement |

> **Connexion admin :** la page de login administrateur est séparée de celle des utilisateurs.
> URL : [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
> Une fois connecté, le dashboard est accessible sur [http://localhost:5173/admin](http://localhost:5173/admin).

### Compte Locataire

| Email                     | Mot de passe                    |
| ------------------------- | ------------------------------- |
| `thomas.bernard@email.fr` | configuré localement uniquement |

### Compte Propriétaire

| Email                 | Mot de passe                    |
| --------------------- | ------------------------------- |
| `luc.martin@email.fr` | configuré localement uniquement |

> **Note :** Ces comptes sont uniquement créés par le seed de développement. Aucun mot de passe de démonstration n'est publié dans le dépôt ; ne lancez jamais le seed sur une base de staging ou de production.

---

## Paiements Stripe

Le tunnel de réservation utilise **Stripe en mode test** : empreinte bancaire à la réservation (capture manuelle), débit uniquement quand le propriétaire confirme, remboursements réels (annulations, litiges), reversement des revenus aux propriétaires via **Stripe Connect** (90 % proprio / 10 % commission), et webhooks de synchronisation.

> **Sans clés Stripe, tout fonctionne quand même** : le paiement bascule en mode simulé (formulaire de carte factice, aucun appel Stripe). Les clés ne sont nécessaires que pour tester le paiement réel.

### Prérequis

1. Un **compte Stripe** gratuit ([stripe.com](https://stripe.com)) — le mode test ne demande ni SIRET ni IBAN réel
2. **Connect activé** sur le compte (pour les virements propriétaires) : Dashboard → **Connect** → « Get started » → profil « Plateforme ou marketplace » (réponses libres en mode test)
3. **Docker** pour le relais de webhooks (image `stripe/stripe-cli`)

### Configuration des clés

Dashboard Stripe (mode **Test**) → **Developers → API keys** :

| Clé                         | Variable                      | Où (méthode Docker)             |
| --------------------------- | ----------------------------- | ------------------------------- |
| Secret key `sk_test_…`      | `STRIPE_SECRET_KEY`           | `.env` racine                   |
| Publishable key `pk_test_…` | `VITE_STRIPE_PUBLISHABLE_KEY` | `.env` racine                   |
| Webhook secret `whsec_…`    | `STRIPE_WEBHOOK_SECRET`       | `.env` racine (voir ci-dessous) |

Après modification du `.env`, **recréer** les conteneurs (un simple restart ne recharge pas les variables) :

```bash
docker compose -f docker-compose.dev.yml up -d backend frontend
```

> Vérification : l'étape paiement du tunnel doit afficher **un seul champ carte** (iframe Stripe) au lieu de trois champs séparés (mode simulé).

### Webhooks (expiration d'empreinte, remboursements externes…)

Stripe ne peut pas joindre `localhost` : lancer le relais dans un terminal dédié —

```bash
docker run --rm -it --network sailingloc_g2_sailingloc_network stripe/stripe-cli \
  listen --api-key sk_test_VOTRE_CLE --forward-to backend:4000/api/webhooks/stripe
```

Au démarrage, la commande affiche `Your webhook signing secret is whsec_…` → copier cette valeur dans `STRIPE_WEBHOOK_SECRET` du `.env` racine, puis recréer le backend. Laisser le terminal ouvert pendant les tests : chaque événement s'y affiche avec le code de réponse du backend (`200` = traité). Sans relais actif, rien ne casse — seuls les événements asynchrones (empreinte expirée à 7 jours, remboursement fait depuis le dashboard) ne sont pas synchronisés.

En production : déclarer l'endpoint `https://<domaine>/api/webhooks/stripe` dans Dashboard → Developers → Webhooks, qui fournit son propre `whsec_…`.

### Données de test Stripe

| Usage                         | Valeur                                         |
| ----------------------------- | ---------------------------------------------- |
| Carte qui fonctionne          | `4242 4242 4242 4242` (date future, CVC libre) |
| Carte refusée                 | `4000 0000 0000 0002`                          |
| Carte 3D Secure               | `4000 0025 0000 3155`                          |
| IBAN (onboarding Connect)     | `FR1420041010050500013M02606`                  |
| Code SMS (onboarding Connect) | `000000`                                       |

> **Aucune donnée bancaire ne touche nos serveurs** (conformité PCI-DSS, profil SAQ A) : la carte est saisie dans un iframe Stripe Elements, l'IBAN des proprios est collecté par l'onboarding hébergé Stripe — la base ne stocke que des références opaques (`pi_…`, `acct_…`).

---

## Scripts disponibles

### Racine

| Commande         | Description                  |
| ---------------- | ---------------------------- |
| `npm run lint`   | Lint backend + frontend      |
| `npm run format` | Formatage backend + frontend |
| `npm test`       | Tests backend                |

### Backend (`cd backend`)

| Commande         | Description                         |
| ---------------- | ----------------------------------- |
| `npm run dev`    | Démarrage avec hot reload (nodemon) |
| `npm start`      | Démarrage en production             |
| `npm test`       | Tests Jest                          |
| `npm run lint`   | ESLint                              |
| `npm run format` | Prettier                            |

### Frontend (`cd frontend`)

| Commande          | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Serveur de développement Vite |
| `npm run build`   | Build de production           |
| `npm run preview` | Prévisualisation du build     |
| `npm run lint`    | ESLint                        |
| `npm run format`  | Prettier                      |

---

## Structure du projet

```
SailingLoc_G2/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma, variables d'environnement
│   │   ├── controllers/     # Logique des routes HTTP
│   │   ├── services/        # Logique métier
│   │   ├── repositories/    # Requêtes Prisma
│   │   ├── models/          # Modèles de données
│   │   ├── routes/          # Endpoints Express
│   │   ├── middlewares/     # JWT, rôles, validation
│   │   ├── utils/           # Fonctions utilitaires
│   │   └── server.js        # Point d'entrée
│   ├── prisma/
│   │   ├── schema.prisma    # Schéma base de données
│   │   └── migrations/      # Migrations SQL
│   ├── tests/               # Tests Jest
│   └── package.json
├── frontend/
│   └── src/
│       ├── assets/          # Images, icônes
│       ├── components/
│       │   ├── common/      # Composants UI réutilisables
│       │   └── features/    # Composants métier
│       ├── pages/           # Pages principales
│       ├── services/        # Appels API Axios
│       ├── context/         # État global (AuthContext)
│       ├── hooks/           # Hooks personnalisés
│       ├── router/          # Configuration React Router
│       ├── utils/           # Fonctions utilitaires
│       ├── main.jsx         # Point d'entrée React
│       └── index.css        # Styles globaux
├── docker-compose.yml           # Production
├── docker-compose.dev.yml       # Développement
├── docker-compose.staging.yml   # Staging
└── Makefile                     # Commandes Docker simplifiées
```

---

## API

Documentation complète (architecture, authentification, endpoints) : [`backend/README.md`](./backend/README.md)

---

## Choses à savoir

### Fichiers ignorés par Git (`.gitignore`)

| Fichier / Dossier             | Raison                                                 |
| ----------------------------- | ------------------------------------------------------ |
| `node_modules/`               | Dépendances npm — à réinstaller avec `npm install`     |
| `.env` et `.env.*`            | Variables d'environnement sensibles — ne jamais commit |
| `frontend/dist/`              | Build Vite généré — non versionné                      |
| `backend/uploads/`            | Fichiers uploadés par les utilisateurs                 |
| `docker-compose.override.yml` | Surcharges Docker locales                              |
| `.vscode/`                    | Configuration éditeur personnelle                      |

> Les fichiers `.env.*.example` sont versionnés et servent de modèles. Copier le bon exemple selon l'environnement (`development`, `staging`, `production`).

### Cookies & consentement (CNIL) — Matomo

Le site embarque une bannière de consentement cookies conforme CNIL :

| Élément                 | Fichier                                                  |
| ----------------------- | -------------------------------------------------------- |
| Logique de consentement | `frontend/src/context/CookieConsentContext.jsx`          |
| Bannière + panneau      | `frontend/src/components/common/CookieConsentBanner.jsx` |
| Chargeur Matomo         | `frontend/src/utils/matomo.js` + `MatomoTracker.jsx`     |

Fonctionnement :

- Le choix (accord **ou** refus) est stocké 6 mois (`sailingloc_cookie_consent`), puis redemandé
- 3 finalités opt-in : mesure d'audience (Matomo), publicité & réseaux sociaux, personnalisation
- Les cookies essentiels (session, langue, sécurité, consentement) sont exemptés et listés dans le panneau
- « Gérer les cookies » dans le footer rouvre le panneau à tout moment

**Règles à respecter par l'équipe :**

1. **Ne jamais charger un script tiers** (analytics, pixel pub, widget social…) sans vérifier la finalité : `useCookieConsent()` (React) ou `getStoredConsent()` (hors React). Exemple : le tracking Matomo ne se charge que si `consent.analytics === true`
2. **Ne pas différencier visuellement** les boutons « Tout accepter » / « Tout refuser » (même classe CSS = exigence CNIL, pas un bug)
3. Si les finalités ou partenaires changent, **incrémenter `CONSENT_VERSION`** dans `CookieConsentContext.jsx` pour redemander le consentement

Consultation des statistiques : [http://localhost:8081](http://localhost:8081) (en prod : sous-domaine HTTPS dédié, ex. `analytics.<domaine>`, défini par `VITE_MATOMO_URL`).

### CI/CD (GitHub Actions)

Le pipeline `.github/workflows/ci.yml` s'exécute automatiquement sur `master`, `develop` et `staging` à chaque push ou pull request. Il vérifie :

1. Lint (backend + frontend)
2. Tests Jest (backend)
3. Build Vite (frontend)
4. Formatage Prettier

---

## Extension TODO Tree

### Installation

1. Ouvrir VS Code
2. Aller dans l'onglet **Extensions** (`Ctrl+Shift+X`)
3. Rechercher **Todo Tree**
4. Installer l'extension publiée par **Gruntfuggly**

### Utilisation

Todo Tree détecte automatiquement les commentaires spéciaux dans le code et les regroupe dans un panneau dédié (icône arbre dans la barre latérale gauche).

Les mots-clés utilisés dans le projet :

| Mot-clé | Usage                                               |
| ------- | --------------------------------------------------- |
| `TODO`  | Tâche à faire, fonctionnalité à implémenter         |
| `FIXME` | Bug connu à corriger                                |
| `HACK`  | Contournement temporaire à refactoriser plus tard   |
| `NOTE`  | Information importante pour les autres développeurs |

**Exemple dans le code :**

```js
// TODO: ajouter la validation du formulaire de réservation
// FIXME: le calcul du prix ne prend pas en compte les week-ends
// HACK: workaround en attendant la correction de l'API Stripe
// NOTE: cette route nécessite le rôle admin
```

Le panneau Todo Tree permet de naviguer directement vers chaque occurrence en un clic, ce qui facilite le suivi des tâches en cours dans l'ensemble du projet.

---

## Workflow Git

### 🏗️ Structure des branches

#### Branches principales

| Branche   | Rôle                         |
| --------- | ---------------------------- |
| `master`  | Production                   |
| `develop` | Intégration et développement |

#### Branches de fonctionnalités (parents)

Format : `feature/nom-de-la-fonctionnalite`

Exemples :

```
feature/authentification-utilisateur
feature/dashboard-admin
feature/paiement-stripe
```

#### Branches de tâches (enfants)

Format : `feature/nom-fonctionnalite/nom-tache`

Exemples :

```
feature/authentification-utilisateur/login-form
feature/authentification-utilisateur/validation-token
feature/dashboard-admin/stats-graph
```

#### Branches de correction

```
fix/description-du-bug
hotfix/critical-issue    # Pour un correctif urgent en production
release/v1.2.0           # Pour une release
```

---

### 📝 Nomenclature des commits

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description>

[corps optionnel]

[footer optionnel]
```

#### Types de commits

| Type       | Usage                                              |
| ---------- | -------------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                            |
| `fix`      | Correction de bug                                  |
| `docs`     | Documentation                                      |
| `style`    | Formatage, point-virgules manquants, etc.          |
| `refactor` | Refactorisation du code                            |
| `test`     | Ajout ou modification de tests                     |
| `chore`    | Tâches de maintenance (MAJ dépendances, config...) |
| `perf`     | Amélioration des performances                      |

#### Exemples de commits

```bash
feat(auth): add login form component
fix(dashboard): correct data rendering issue
docs(readme): update installation instructions
refactor(api): simplify error handling logic
test(auth): add unit tests for token validation
```

---

### 🔄 Workflow détaillé

#### 1. Création de la branche de fonctionnalité (parent)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-fonctionnalite
```

#### 2. Création d'une branche de tâche (enfant)

```bash
git checkout -b feature/nom-fonctionnalite/tache-1
# Travail sur la tâche...
git add .
git commit -m "feat(module): description de la tâche"
```

#### 3. Merge de la tâche dans la branche parent

```bash
git checkout feature/nom-fonctionnalite
git pull origin feature/nom-fonctionnalite  # Au cas où
git merge feature/nom-fonctionnalite/tache-1
git push origin feature/nom-fonctionnalite
```

#### 4. Création de la tâche suivante

```bash
git checkout -b feature/nom-fonctionnalite/tache-2
# Continuer le cycle...
```

#### 5. Finalisation : merge dans develop

```bash
# Une fois toutes les tâches terminées
git checkout develop
git pull origin develop
git merge feature/nom-fonctionnalite
git push origin develop
```

---

### 🎯 Best practices — Pull Requests

#### Titres de PR

```
[Feature] Nom de la fonctionnalité
[Fix] Description du bug corrigé
[Refactor] Description de la refactorisation
```

#### Template de description

```markdown
## Description

Brève description de la fonctionnalité/correction

## Type de changement

- [ ] Nouvelle fonctionnalité
- [ ] Correction de bug
- [ ] Refactorisation
- [ ] Documentation

## Checklist

- [ ] Code testé localement
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Documentation mise à jour
- [ ] Pas de conflits avec develop
```

#### Message de merge

```bash
git merge --no-ff feature/nom-fonctionnalite -m "Merge feature: description"
```

---

### 📊 Exemple de workflow complet

```bash
# Démarrage
git checkout develop
git pull origin develop
git checkout -b feature/payment-system

# Tâche 1
git checkout -b feature/payment-system/stripe-integration
# ... travail ...
git commit -m "feat(payment): integrate Stripe SDK"
git checkout feature/payment-system
git merge feature/payment-system/stripe-integration

# Tâche 2
git checkout -b feature/payment-system/payment-form
# ... travail ...
git commit -m "feat(payment): create payment form component"
git checkout feature/payment-system
git merge feature/payment-system/payment-form

# Tâche 3
git checkout -b feature/payment-system/error-handling
# ... travail ...
git commit -m "feat(payment): add error handling and user feedback"
git checkout feature/payment-system
git merge feature/payment-system/error-handling

# Finalisation
git checkout develop
git merge feature/payment-system
git push origin develop
```

---

Développé avec ❤️ pour les passionnés de navigation
