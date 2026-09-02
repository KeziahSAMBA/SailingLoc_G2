<!-- markdownlint-disable MD024 MD025 MD060 -->

# SailingLoc — Backend API

API REST du projet SailingLoc, construite avec **Node.js**, **Express** et **Prisma** sur une base **PostgreSQL**.

> 📘 Pour l'installation globale, le workflow Git et les comptes de test, voir le [README racine](../README.md).

---

## Sommaire

- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Structure du backend](#structure-du-backend)
- [Comment fonctionne l'API ?](#comment-fonctionne-lapi-)
- [Authentification](#authentification)
- [Endpoints — Référence](#endpoints--référence)
- [Format des réponses](#format-des-réponses)
- [Tests](#tests)

---

## Stack technique

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

## Démarrage rapide

En Docker (recommandé), tout est lancé via `docker-compose -f docker-compose.dev.yml up` depuis la racine. L'API est alors exposée sur [http://localhost:4000](http://localhost:4000).

En local :

```bash
cd backend
cp .env.development.example .env
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed   # données de test
npm run dev          # hot reload via nodemon
```

Variables d'environnement principales (`backend/.env`) :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sailingloc
JWT_SECRET=votre_secret_jwt
STRIPE_SECRET_KEY=sk_test_...
EMAIL_HOST=localhost
EMAIL_PORT=1025
PORT=4000
```

---

## Structure du backend

```
backend/
├── src/
│   ├── config/          # Prisma client, variables d'environnement
│   ├── controllers/     # Logique des routes HTTP (parsing req/res)
│   ├── services/        # Logique métier (règles, validations)
│   ├── repositories/    # Requêtes Prisma vers PostgreSQL
│   ├── routes/          # Déclaration des endpoints Express
│   ├── middlewares/     # JWT, contrôle de rôle, rate-limit, validation
│   ├── utils/           # Helpers (regions, mailer, tokens, …)
│   └── server.js        # Point d'entrée Express
├── prisma/
│   ├── schema.prisma    # Schéma base de données
│   ├── migrations/      # Migrations SQL générées
│   └── seed.js          # Données de test
├── storage/
│   └── documents/       # Fichiers uploadés (hors dossier statique)
├── uploads/             # Images bateaux (servi en statique)
└── tests/               # Tests Jest
```

---

## Comment fonctionne l'API ?

### Principe général

L'API REST est exposée sous le préfixe `/api` (port `4000` en dev). Elle est consommée par le frontend React via **Axios** et expose des données au format **JSON**.

Le frontend ne parle **jamais directement à la base de données**. Il envoie des requêtes HTTP au backend, qui :

1. **reçoit la requête**, vérifie son format et l'identité de l'appelant,
2. **applique la logique métier** (règles d'autorisation, validation, calculs),
3. **lit/écrit en base** via Prisma (PostgreSQL),
4. **renvoie une réponse JSON** avec un code HTTP indiquant le résultat.

```
[ React + Axios ]  ──HTTP──►  [ Express API ]  ──Prisma──►  [ PostgreSQL ]
   localhost:5173             localhost:4000                   port 5433
```

### Architecture en couches

Chaque requête traverse plusieurs couches du backend (`backend/src/`), chacune avec un rôle précis :

| Couche           | Dossier         | Rôle                                                      |
| ---------------- | --------------- | --------------------------------------------------------- |
| **Routes**       | `routes/`       | Déclare l'URL + méthode HTTP et chaîne les middlewares    |
| **Middlewares**  | `middlewares/`  | Vérifient le JWT, le rôle, le rate-limit, parsent le body |
| **Controllers**  | `controllers/`  | Lisent `req`, appellent le service, renvoient la réponse  |
| **Services**     | `services/`     | Contiennent la logique métier (règles, calculs)           |
| **Repositories** | `repositories/` | Encapsulent les requêtes Prisma vers PostgreSQL           |

> 💡 Cette séparation permet de **tester** la logique métier sans dépendre d'Express ni de la base, et de **réutiliser** un service depuis plusieurs contrôleurs.

### Cycle de vie d'une requête (exemple : connexion admin)

```
1. Frontend → POST /api/admin/login { email, password }
                │
2.             ▼  routes/adminRoutes.js
               app.use('/api/admin/login', adminLoginLimiter)   ← rate-limit IP
               router.post('/login', adminLogin)
                │
3.             ▼  controllers/userController.js → adminLogin()
               - récupère email/password depuis req.body
               - appelle userService.loginAdmin(...)
                │
4.             ▼  services/userService.js → loginAdmin()
               - cherche l'utilisateur (repository)
               - vérifie qu'il a bien le rôle "admin"
               - compare le hash bcrypt
               - génère access token + refresh token
                │
5.             ▼  repositories/userRepository.js
               - prisma.user.findUnique({ where: { email } })
                │
6.             ▼  Retour au controller
               - pose le refresh token en cookie httpOnly
               - res.status(200).json({ accessToken, user })
                │
7. Frontend ← réponse JSON, stocke l'access token et redirige vers /admin
```

### Conventions REST

Toutes les routes suivent les conventions REST :

```http
GET    /api/{ressource}        → liste
GET    /api/{ressource}/:id    → un élément
POST   /api/{ressource}        → créer
PATCH  /api/{ressource}/:id    → modifier partiellement
DELETE /api/{ressource}/:id    → supprimer
```

Les données sont envoyées :

- en **JSON** (`Content-Type: application/json`) pour la majorité des requêtes,
- en **multipart/form-data** pour les uploads de fichiers (bateaux, documents) — gérés par **Multer**.

### Exemple concret côté frontend

```js
// frontend/src/services/adminService.js
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL; // http://localhost:4000/api

export async function listPorts(token) {
  const res = await axios.get(`${API}/admin/ports`, {
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: true, // pour envoyer le cookie refresh
  });
  return res.data;
}
```

Côté backend, cette requête passe par : `adminRoutes` → middlewares `protect` + `requireAdmin` → `portAdminController.adminListPorts` → `portAdminService` → Prisma → réponse JSON.

---

## Authentification

L'API utilise un système **JWT à deux tokens** :

| Token             | Durée    | Stockage côté client         | Rôle                                        |
| ----------------- | -------- | ---------------------------- | ------------------------------------------- |
| **Access token**  | ~15 min  | en mémoire (state React)     | Envoyé dans `Authorization: Bearer <token>` |
| **Refresh token** | ~7 jours | cookie `httpOnly` + `Secure` | Permet de régénérer un access token expiré  |

### Flux d'authentification

1. **Login** → l'API renvoie l'access token (dans le body) + pose un cookie avec le refresh token.
2. À chaque requête protégée, le frontend ajoute `Authorization: Bearer <accessToken>`.
3. Quand l'access token expire (401), le frontend appelle `POST /api/users/refresh` → le cookie est lu, un nouvel access token est renvoyé.
4. **Logout** → le refresh token est révoqué côté serveur, le cookie est supprimé.

### Middlewares de sécurité

- **`protect`** — vérifie le JWT et injecte `req.user` (id, rôle, email)
- **`requireRole('proprietaire', 'admin')`** — refuse si l'utilisateur n'a pas un des rôles listés
- **`requireAdmin`** — raccourci pour `requireRole('admin')`
- **Rate-limiters** — limitent les tentatives par IP sur les routes sensibles (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/resend-verification`, `/admin/login`)

> ⚠️ **Sécurité — réutilisation de refresh token** : chaque refresh token est à usage unique. Si un token déjà révoqué est rejoué (signe probable d'un vol), **toute la session utilisateur est invalidée** : il est déconnecté de tous ses appareils. C'est une protection contre les attaques de type _token theft_.

---

## Endpoints — Référence

### 👤 Utilisateurs & Auth — `/api/users`

| Méthode | Route                              | Auth | Description                               |
| ------- | ---------------------------------- | ---- | ----------------------------------------- |
| `POST`  | `/api/users/register`              | ❌   | Inscription (envoi d'un email de vérif.)  |
| `POST`  | `/api/users/login`                 | ❌   | Connexion utilisateur (locataire/proprio) |
| `POST`  | `/api/users/refresh`               | ❌   | Rafraîchit l'access token via cookie      |
| `POST`  | `/api/users/logout`                | ❌   | Révoque le refresh token et déconnecte    |
| `POST`  | `/api/users/resend-verification`   | ❌   | Renvoie l'email de vérification           |
| `POST`  | `/api/users/forgot-password`       | ❌   | Envoie un email de réinitialisation       |
| `POST`  | `/api/users/reset-password`        | ❌   | Définit un nouveau mot de passe via token |
| `GET`   | `/api/users/reset-password/:token` | ❌   | Vérifie la validité du token de reset     |
| `GET`   | `/api/users/verify-email/:token`   | ❌   | Confirme l'adresse email                  |
| `GET`   | `/api/users/me`                    | ✅   | Profil de l'utilisateur connecté          |
| `PATCH` | `/api/users/me`                    | ✅   | Met à jour le profil                      |
| `PATCH` | `/api/users/me/password`           | ✅   | Change le mot de passe                    |

### ⛵ Bateaux — `/api/boats`

| Méthode | Route        | Auth                    | Description                                |
| ------- | ------------ | ----------------------- | ------------------------------------------ |
| `GET`   | `/api/boats` | ❌                      | Liste publique des bateaux                 |
| `POST`  | `/api/boats` | ✅ (proprietaire/admin) | Créer un bateau avec upload (max 5 images) |

### 📄 Documents — `/api/documents`

Gestion des pièces justificatives (permis, carte d'identité, etc.). Les fichiers sont stockés **hors du dossier statique** : ils ne sont téléchargeables que via la route protégée.

| Méthode  | Route                     | Auth                        | Description                                |
| -------- | ------------------------- | --------------------------- | ------------------------------------------ |
| `GET`    | `/api/documents`          | ✅ (locataire/proprietaire) | Liste mes documents                        |
| `POST`   | `/api/documents`          | ✅ (locataire/proprietaire) | Upload un document (PDF/JPG/PNG, max 5 Mo) |
| `DELETE` | `/api/documents/:id`      | ✅ (locataire/proprietaire) | Supprime un de mes documents               |
| `GET`    | `/api/documents/:id/file` | ✅ (propriétaire ou admin)  | Téléchargement protégé du fichier          |

### 🛠️ Administration — `/api/admin`

Toutes les routes (sauf `login`) requièrent le rôle **admin** (middleware `requireAdmin`).

#### Authentification & statistiques

| Méthode | Route              | Description                             |
| ------- | ------------------ | --------------------------------------- |
| `POST`  | `/api/admin/login` | Connexion admin (route séparée)         |
| `GET`   | `/api/admin/stats` | Statistiques globales pour le dashboard |

#### Gestion des utilisateurs

| Méthode  | Route                  | Description                           |
| -------- | ---------------------- | ------------------------------------- |
| `GET`    | `/api/admin/users`     | Liste tous les utilisateurs (filtres) |
| `POST`   | `/api/admin/users`     | Crée un utilisateur (rôle au choix)   |
| `PATCH`  | `/api/admin/users/:id` | Met à jour un utilisateur             |
| `DELETE` | `/api/admin/users/:id` | Supprime un utilisateur               |

#### Gestion des documents

| Méthode | Route                      | Description                          |
| ------- | -------------------------- | ------------------------------------ |
| `GET`   | `/api/admin/documents`     | Liste tous les documents (à valider) |
| `PATCH` | `/api/admin/documents/:id` | Valide ou rejette un document        |

#### Gestion des bateaux & signalements

| Méthode | Route                    | Description                       |
| ------- | ------------------------ | --------------------------------- |
| `GET`   | `/api/admin/boats`       | Liste tous les bateaux            |
| `PATCH` | `/api/admin/boats/:id`   | Publie ou dépublie un bateau      |
| `GET`   | `/api/admin/reports`     | Liste les signalements            |
| `PATCH` | `/api/admin/reports/:id` | Change le statut d'un signalement |

#### Gestion des réservations & litiges

| Méthode | Route                            | Description                   |
| ------- | -------------------------------- | ----------------------------- |
| `GET`   | `/api/admin/bookings`            | Liste toutes les réservations |
| `PATCH` | `/api/admin/bookings/:id/cancel` | Annule une réservation        |
| `GET`   | `/api/admin/disputes`            | Liste les litiges             |
| `PATCH` | `/api/admin/disputes/:id`        | Change le statut d'un litige  |

#### Modération des avis

| Méthode  | Route                    | Description               |
| -------- | ------------------------ | ------------------------- |
| `GET`    | `/api/admin/reviews`     | Liste tous les avis       |
| `PATCH`  | `/api/admin/reviews/:id` | Modifie ou masque un avis |
| `DELETE` | `/api/admin/reviews/:id` | Supprime un avis          |

#### Gestion des ports

| Méthode  | Route                  | Description                         |
| -------- | ---------------------- | ----------------------------------- |
| `GET`    | `/api/admin/ports`     | Liste tous les ports (avec régions) |
| `POST`   | `/api/admin/ports`     | Crée un port                        |
| `DELETE` | `/api/admin/ports/:id` | Supprime un port                    |

### 🩺 Health-check

| Méthode | Route     | Description                                        |
| ------- | --------- | -------------------------------------------------- |
| `GET`   | `/health` | Vérifie que le serveur répond (`{ status: 'ok' }`) |

---

## Format des réponses

- **Succès** : `200/201` avec un corps JSON (`{ data, message? }` ou directement l'objet)
- **Erreur client** : `400` (validation), `401` (non authentifié), `403` (rôle insuffisant), `404` (introuvable), `409` (conflit), `429` (rate limit)
- **Erreur serveur** : `500` avec `{ message }`

Les uploads de fichiers (bateaux, documents) utilisent `multipart/form-data` via **Multer**.

---

## Tests

Les tests sont écrits avec **Jest** et placés dans `backend/tests/`.

```bash
npm test               # lance la suite complète
npm test -- --watch    # mode watch
npm run test:coverage  # avec rapport de couverture
```

La logique métier est testée au niveau des **services** (sans Express ni base réelle) ; les repositories peuvent être mockés.

Les seuils de couverture sont définis dans `jest.config.js` et vérifiés à chaque
exécution : passer en dessous fait échouer la commande et la CI.

### Tests de montée en charge

Ils ne sont **pas** ici : ils utilisent k6, visent le backend déployé sur Railway
staging, et sont documentés dans [`loadtest/README.md`](../loadtest/README.md).

Deux points touchent ce dossier :

- `src/server.js` et `src/services/emailService.js` réagissent à `LOAD_TEST_MODE`
  (rate limiting, transport email, planificateur cron neutralisés) ;
- `prisma/seedLoad.js` injecte le jeu volumétrique, appelé automatiquement par le
  `preDeployCommand` de `railway.json`.

---

Pour toute question sur l'installation, les comptes de test ou le workflow Git, voir le [README racine](../README.md).
