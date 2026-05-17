<!-- markdownlint-disable MD024 MD025 MD060 -->

# SailingLoc — Guide développeur

Plateforme de location de bateaux — projet fullstack avec un backend Node.js/Express et un frontend React/Vite.

---

## Sommaire

- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Scripts disponibles](#scripts-disponibles)
- [Structure du projet](#structure-du-projet)
- [API — Endpoints principaux](#api--endpoints-principaux)
- [Choses à savoir](#choses-à-savoir)
- [Extension TODO Tree](#extension-todo-tree)
- [Workflow Git](#workflow-git)

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

> Les emails d'inscription/vérification sont interceptés par MailDev — aucun vrai email n'est envoyé. Ouvrez [http://localhost:1080](http://localhost:1080) pour les consulter.

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
cp .env.development.example .env

# Frontend
cd ../frontend
cp .env.development.example .env
```

Variables backend à renseigner dans `backend/.env` :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sailingloc
JWT_SECRET=votre_secret_jwt
STRIPE_SECRET_KEY=sk_test_...
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=
EMAIL_PASS=
PORT=4000
```

Variable frontend à renseigner dans `frontend/.env` :

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

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

| Email                 | Mot de passe   |
| --------------------- | -------------- |
| `admin@sailingloc.fr` | `Admin@123456` |

### Compte Locataire

| Email                     | Mot de passe           |
| ------------------------- | ---------------------- |
| `thomas.bernard@email.fr` | `Locataire@2025Secure` |

### Compte Propriétaire

| Email                 | Mot de passe              |
| --------------------- | ------------------------- |
| `luc.martin@email.fr` | `Proprietaire@2025Secure` |

> **Note :** Tous les mots de passe sont hachés avec bcrypt. Les données de test incluent 13 utilisateurs, 8 bateaux, 8 ports et 14 réservations pour un environnement de développement complet.

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

## API — Endpoints principaux

| Méthode | Route                | Description                    |
| ------- | -------------------- | ------------------------------ |
| `GET`   | `/api/boats`         | Liste des bateaux              |
| `POST`  | `/api/boats`         | Créer un bateau (auth requise) |
| `POST`  | `/api/auth/register` | Inscription                    |
| `POST`  | `/api/auth/login`    | Connexion                      |
| `GET`   | `/api/bookings`      | Réservations de l'utilisateur  |
| `POST`  | `/api/bookings`      | Créer une réservation          |

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
