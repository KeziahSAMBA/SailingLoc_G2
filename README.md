# SailingLoc

Plateforme de location de bateaux — projet fullstack avec un backend Node.js/Express et un frontend React/Vite.

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

---

## Installation et lancement

### Méthode recommandée : Docker

Tout se lance en une seule commande depuis la racine du projet :

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Cela démarre automatiquement :

- le frontend sur [http://localhost:5173](http://localhost:5173)
- le backend sur [http://localhost:4000](http://localhost:4000)
- PostgreSQL sur le port `5433`

Pour arrêter :

```bash
docker-compose -f docker-compose.dev.yml down
```

---

### Méthode locale (sans Docker)

#### 1. Installer les dépendances

```bash
# À la racine
npm install

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

#### 2. Configurer les variables d'environnement

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
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=votre@email.com
EMAIL_PASS=votre_mot_de_passe
PORT=4000
```

Variable frontend à renseigner dans `frontend/.env` :

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

#### 3. Initialiser la base de données

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
# Optionnel : données de test
npx prisma db seed
```

#### 4. Lancer les serveurs

Dans deux terminaux séparés :

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

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

### Branches

| Branche   | Usage                                    |
| --------- | ---------------------------------------- |
| `master`  | Code stable — ne pas pousser directement |
| `develop` | Branche de développement principale      |
| `staging` | Validation pré-production                |

Toujours travailler sur `develop` (ou une branche feature), puis merger vers `master` une fois validé.

### CI/CD (GitHub Actions)

Le pipeline `.github/workflows/ci.yml` s'exécute automatiquement sur `master`, `develop` et `staging` à chaque push ou pull request. Il vérifie :

1. Lint (backend + frontend)
2. Tests Jest (backend)
3. Build Vite (frontend)
4. Formatage Prettier

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

Développé avec ❤️ pour les passionnés de navigation
