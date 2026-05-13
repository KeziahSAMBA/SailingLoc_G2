# SailingLoc

Plateforme de location de bateaux - Projet fullstack avec Backend Node.js / Express et Frontend React / Vite.

## Technologies utilisées

### Frontend

- **React** v18.3 - Bibliothèque JavaScript pour interfaces utilisateur
- **React Router** v6.x - Routage côté client
- **Vite** v5.x - Outil de build rapide pour développement moderne
- **TailwindCSS** v3.x - Framework CSS utilitaire
- **Axios** v1.x - Client HTTP pour requêtes API
- **FullCalendar** v6.x - Bibliothèque de calendrier interactif

### Backend

- **Node.js** v20.x - Environnement d'exécution JavaScript côté serveur
- **Express.js** v4.x - Framework web pour Node.js
- **JSON Web Token (JWT)** v9.x - Authentification basée sur tokens
- **Bcrypt** v5.x - Hachage de mots de passe
- **Stripe SDK** v14.x - Intégration paiements Stripe
- **Multer** v1.x - Gestion des fichiers uploadés
- **Nodemailer** v6.x - Envoi d'emails

### Base de données et ORM

- **PostgreSQL** v16.x - Système de gestion de base de données relationnelle
- **Prisma ORM** v5.x - ORM moderne pour Node.js et TypeScript

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

1. **Node.js** v20.x ou supérieur
   - Téléchargeable sur [nodejs.org](https://nodejs.org/)
   - Vérifiez avec : `node --version`

2. **PostgreSQL** v16.x ou supérieur
   - Téléchargeable sur [postgresql.org](https://www.postgresql.org/download/)
   - Créez une base de données pour le projet

3. **Git** (optionnel, pour le versioning)
   - Téléchargeable sur [git-scm.com](https://git-scm.com/)

## Installation

### 1. Cloner le projet (si applicable)

```bash
git clone <url-du-repo>
cd SailingLoc_G2
```

### 2. Configuration de l'environnement

#### Backend

```bash
cd backend
cp .env.example .env
```

Éditez le fichier `.env` avec vos propres valeurs :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sailingloc
JWT_SECRET=votre_secret_jwt_unique
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=votre_email@example.com
EMAIL_PASS=votre_mot_de_passe_email
PORT=4000
```

#### Frontend

```bash
cd ../frontend
cp .env.example .env
```

Éditez le fichier `.env` :

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 3. Installation des dépendances

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```

### 4. Configuration de la base de données

#### Générer le client Prisma

```bash
cd backend
npx prisma generate
```

#### Créer et appliquer les migrations

```bash
npx prisma migrate dev --name init
```

#### (Optionnel) Peupler la base avec des données de test

```bash
npx prisma db seed
```

## Démarrage du projet

### 🚀 Méthode recommandée : Docker (Environnement isolé)

#### Prérequis Docker

- **Docker** v24+ et **Docker Compose** v2+
- Téléchargeable sur [docker.com](https://www.docker.com/)

#### Démarrage en mode développement (avec hot reload)

```bash
# Démarrer tous les services
make dev

# Ou directement avec docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

#### Démarrage en mode production

```bash
# Démarrer tous les services
make prod

# Ou directement avec docker-compose
docker-compose up --build
```

#### URLs d'accès avec Docker

- **Frontend** : `http://localhost:5173` (développement) ou `http://localhost:3000` (production)
- **Backend API** : `http://localhost:4000`
- **Base de données** : `localhost:5433` (développement) ou `localhost:5432` (production)

#### Commandes Docker utiles

```bash
# Voir les logs
make logs

# Redémarrer les services
make restart

# Arrêter tous les services
make dev-down  # développement
make prod-down # production

# Nettoyer tout (containers, volumes, images)
make clean

# Accéder à un shell dans un container
make shell-backend  # backend
make shell-frontend # frontend
make shell-db       # base de données
```

#### Vérifier l'état des services Docker

```bash
# Script de vérification (Linux/Mac)
./check-docker.sh

# Ou vérifier manuellement
docker-compose -f docker-compose.dev.yml ps
```

### 🖥️ Méthode alternative : Démarrage local (sans Docker)

#### Prérequis locaux

- **Node.js** v20.x
- **PostgreSQL** v16.x (base de données locale)

#### Démarrage en mode développement local

##### Terminal 1 : Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Le serveur backend sera accessible sur `http://localhost:4000`

##### Terminal 2 : Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application frontend sera accessible sur `http://localhost:5173`

### Scripts disponibles

#### Backend (`backend/package.json`)

- `npm run dev` : Démarrage avec nodemon (rechargement automatique)
- `npm start` : Démarrage en production
- `npm run prisma:migrate` : Appliquer les migrations Prisma
- `npm run prisma:generate` : Générer le client Prisma
- `npm test` : Exécuter les tests Jest

#### Frontend (`frontend/package.json`)

- `npm run dev` : Démarrage du serveur de développement Vite
- `npm run build` : Build de production
- `npm run preview` : Prévisualisation du build

## Architecture Docker

Le projet utilise Docker pour créer un environnement de développement isolé et reproductible :

### Services Docker

- **postgres** : Base de données PostgreSQL 16
- **backend** : API Node.js/Express avec Prisma ORM
- **frontend** : Application React/Vite avec Nginx en production
- **redis** : Cache Redis (optionnel pour les sessions et cache)

### Volumes persistants

- `postgres_data` : Données de la base PostgreSQL
- `redis_data` : Données Redis
- Montage des dossiers `backend/uploads` pour les fichiers uploadés

### Réseau

Tous les services sont connectés via le réseau `sailingloc_network` pour permettre la communication inter-conteneurs.

### Fichiers de configuration

- `docker-compose.yml` : Configuration production
- `docker-compose.dev.yml` : Configuration développement avec hot reload
- `Dockerfile` : Image production pour chaque service
- `Dockerfile.dev` : Image développement avec volumes montés
- `Makefile` : Commandes simplifiées pour la gestion Docker

```
SailingLoc_G2/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration BDD et variables d'environnement
│   │   ├── controllers/     # Gestion des requêtes HTTP
│   │   ├── services/        # Logique métier
│   │   ├── repositories/    # Requêtes Prisma vers PostgreSQL
│   │   ├── models/          # Modèles de données
│   │   ├── routes/          # Endpoints Express.js
│   │   ├── middlewares/     # JWT, rôles, validation, rate limiting
│   │   ├── utils/           # Fonctions utilitaires transverses
│   │   └── server.js        # Point d'entrée Express
│   ├── prisma/
│   │   ├── schema.prisma    # Schéma des modèles et relations
│   │   └── migrations/      # Migrations SQL auto-générées
│   ├── uploads/             # Fichiers Multer (boats/ avatars/ documents/)
│   ├── tests/               # Tests Jest
│   ├── .env.example
│   ├── jest.config.js
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── assets/          # Images, icônes, polices
│       ├── components/
│       │   ├── common/      # Composants UI réutilisables
│       │   └── features/    # Composants métier par domaine
│       ├── pages/           # Pages principales
│       ├── services/        # Appels API Axios
│       ├── context/         # État global (AuthContext)
│       ├── hooks/           # Hooks personnalisés
│       ├── utils/           # Fonctions utilitaires
│       ├── router/          # Configuration React Router
│       ├── main.jsx         # Point d'entrée React
│       └── index.css        # Styles globaux
│   ├── .env.example
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── .gitignore
└── README.md
```

## API Endpoints

### Bateaux

- `GET /api/boats` - Récupérer tous les bateaux
- `POST /api/boats` - Créer un nouveau bateau (authentification requise)

### Authentification

- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/register` - Inscription utilisateur

### Réservations

- `POST /api/bookings` - Créer une réservation
- `GET /api/bookings` - Récupérer les réservations de l'utilisateur

## Avantages de Docker

### ✅ Isolation complète

- Environnement de développement identique en local et en production
- Pas de conflits avec les installations locales (Node.js, PostgreSQL)
- Gestion simplifiée des dépendances

### ✅ Reproductibilité

- Configuration partagée entre tous les développeurs
- Démarrage rapide pour les nouveaux arrivants
- Tests d'intégration facilités

### ✅ Performance

- Images optimisées pour la production
- Cache intelligent des couches Docker
- Scaling horizontal possible

### ⚠️ Considérations importantes

- **Première installation** : Téléchargement des images (~500MB)
- **Ressources système** : Nécessite Docker Desktop ou Docker Engine
- **Ports** : Vérifier que les ports 4000, 5173, 5432/5433 ne sont pas utilisés
- **Volumes** : Les données de la base sont persistées même après `docker-compose down`

### 🔄 Migration depuis l'environnement local

Si vous aviez une base de données locale :

1. Exportez vos données : `pg_dump sailingloc > backup.sql`
2. Démarrez Docker : `make dev`
3. Importez dans le container : `docker-compose exec postgres psql -U sailingloc_user -d sailingloc < backup.sql`

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm run test  # Si configuré
```

## Déploiement

### Build de production

#### Backend

```bash
cd backend
npm run build  # Si applicable
```

#### Frontend

```bash
cd frontend
npm run build
```

Les fichiers de build seront générés dans `frontend/dist/`

## Contribution

1. Fork le projet
2. Créez votre branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Support

Pour toute question ou problème :

- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement

---

Développé avec ❤️ pour les passionnés de navigation
