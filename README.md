<!-- markdownlint-disable MD024 MD025 MD060 -->

# SailingLoc — Guide développeur

Plateforme de location de bateaux entre particuliers — projet fullstack avec un
backend **Node.js/Express** (API REST + Prisma/PostgreSQL) et un frontend
**React/Vite**. Paiements via **Stripe** (empreinte, capture manuelle, Stripe
Connect, remboursements, webhooks), envoi d'emails **MailDev** en local /
**Mailgun** en production, mesure d'audience **Matomo** avec consentement CNIL,
internationalisation FR/EN, mode nuit et profils d'accessibilité visuelle.
Déploiement sur **Railway** (ou `docker-compose` auto-hébergé), CI/CD et portes
de sécurité **GitHub Actions**, suite de tests **Jest**.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Identité visuelle](#identité-visuelle)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Comptes de test](#comptes-de-test)
- [Paiements Stripe](#paiements-stripe)
- [Déploiement (Railway)](#déploiement-railway)
- [Tests](#tests)
- [Scripts disponibles](#scripts-disponibles)
- [Structure du projet](#structure-du-projet)
- [API](#api)
- [Choses à savoir](#choses-à-savoir)
- [Extension TODO Tree](#extension-todo-tree)
- [Workflow Git](#workflow-git)

---

## Fonctionnalités

### Catalogue & pages publiques

- **Page d'accueil** visiteur, avec une variante dédiée au propriétaire connecté
- **Catalogue** de bateaux : recherche, barre de filtres, tri, pagination côté serveur
- **Fiche bateau** : carrousel photos + lightbox, équipements, disponibilités,
  avis notés, accès au profil du propriétaire, contact par messagerie
- **Profils publics** propriétaire et locataire (avec avis)
- Pages **À propos**, **Contact** (formulaire traité côté API), **404** personnalisée
- **RGPD** : mentions légales, CGU, CGV, politique de confidentialité
- **SEO** : métadonnées par route, données structurées JSON-LD, `sitemap.xml`,
  `robots.txt`, pré-rendu des pages publiques au build (Playwright)
- **Cookies & consentement CNIL** + mesure d'audience **Matomo** (opt-in par finalité)
- **Internationalisation** FR / EN (i18next)
- **Accessibilité visuelle** : mode nuit, profils de vision des couleurs
  (daltonisme), mémorisation des préférences

### Authentification & compte

- Inscription avec **email de vérification**, connexion / déconnexion
- **JWT à deux tokens** (access ~15 min en mémoire + refresh ~7 j en cookie
  `httpOnly`), refresh token à usage unique (invalidation de session si rejeu)
- Mot de passe oublié / réinitialisation par email
- **Déconnexion automatique** après inactivité
- Édition du profil, changement de mot de passe, **photo de profil**
- **Désactivation / suppression de compte** (RGPD)
- **Pièces justificatives** (permis, identité) : upload, suivi de validation,
  **chiffrement au repos AES-256-GCM**, téléchargement via route protégée

### Locataire

- **Tunnel de réservation** avec vérification de disponibilité en temps réel
- **Empreinte bancaire Stripe** à la réservation (capture manuelle), panier
  conservé 15 min avec gestion de l'expiration de session
- Historique des réservations, **annulation + demande de remboursement**, litiges
- **Favoris**, **Mes dépenses** (historique des paiements), **factures PDF**
- **Avis** après séjour, **messagerie** avec le propriétaire

### Propriétaire

- Dashboard, **gestion des bateaux** (création/édition, jusqu'à 5 images,
  équipements, calendrier de disponibilités)
- **Confirmation / refus** des demandes de réservation (déclenche le débit)
- **Revenus** et reversement via **Stripe Connect** (90 % propriétaire /
  10 % commission), onboarding Connect hébergé
- Gestion des documents, avis reçus, messagerie

### Back-office administrateur (login séparé)

- Statistiques globales, **journaux d'activité**
- Utilisateurs (CRUD, filtres, création avec rôle au choix)
- Validation des **documents**, publication/validation des **bateaux**, **signalements**
- **Réservations** (annulation) et **litiges**, **modération des avis**
- **Ports** (régions, médias), **transactions / paiements**
- Messagerie & **demandes de contact**
- **Tâches planifiées (cron)** : suivi des exécutions et programmation
- **Vue spectateur** (parcours locataire / propriétaire en lecture seule)

### Tâches planifiées (cron — `croner`)

Expiration des réservations en attente (`bookings.expire`), migration des
fichiers privés (`files.migrate`), et purges RGPD/rétention :
`tokens.purge`, `logs.purge`, `messages.purge`, `images.purge`,
`contact.purge`, `cron.runs.purge`, `users.unverified.purge`,
`users.inactive.purge`, `users.paused.purge`, `users.purge`.

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

| Technologie             | Version   | Rôle                                              |
| ----------------------- | --------- | ------------------------------------------------- |
| React                   | 18.3      | Interface utilisateur                             |
| React Router            | 6.x       | Routage côté client (SPA)                         |
| Vite                    | 6.x       | Serveur de développement et build de production   |
| TailwindCSS             | 3.4       | Styles utilitaires                                |
| Axios                   | 1.x       | Requêtes HTTP vers l'API                          |
| i18next / react-i18next | 26.x      | Internationalisation FR / EN                      |
| Leaflet / react-leaflet | 1.9       | Cartes (tuiles Carto), localisation des ports     |
| Recharts                | 2.15      | Graphiques des dashboards (revenus, statistiques) |
| Motion                  | 12.x      | Animations et transitions de page                 |
| @stripe/react-stripe-js | 6.x / 9.x | Formulaire de carte (Stripe Elements)             |
| Playwright              | 1.61      | Pré-rendu SEO des pages publiques (build)         |

### Backend

| Technologie        | Version | Rôle                                            |
| ------------------ | ------- | ----------------------------------------------- |
| Node.js            | 22.x    | Environnement d'exécution (`engines: >=22 <23`) |
| Express.js         | 4.x     | Framework web                                   |
| Prisma ORM         | 5.x     | Accès base de données (32 migrations)           |
| PostgreSQL         | 16      | Base de données relationnelle                   |
| jsonwebtoken       | 9.x     | Authentification par tokens (access + refresh)  |
| bcryptjs           | 2.x     | Hachage des mots de passe                       |
| Stripe SDK         | 14.x    | Paiements, Connect, remboursements, webhooks    |
| Multer             | 1.x     | Upload de fichiers (images bateaux, documents)  |
| Nodemailer         | 9.x     | Envoi d'emails en local (SMTP / MailDev)        |
| Mailgun (API HTTP) | —       | Envoi d'emails en production (Railway)          |
| croner             | 10.x    | Planification des tâches de purge (cron)        |
| @dr.pogodin/csurf  | 1.17    | Protection CSRF (double-submit cookie)          |
| express-rate-limit | 8.x     | Limitation des tentatives par IP                |
| pdfkit             | 0.19    | Génération des factures PDF                     |

> CI : les tests tournent aussi sur **Node 20** (matrice GitHub Actions) ; le
> runtime Docker/Railway du backend est **Node 22** (requis par `@dr.pogodin/csurf`).

---

## Prérequis

- **Docker** v24+ et **Docker Compose** v2+ (méthode recommandée)
- **ou** Node.js v22 (`engines: >=22 <23`) et PostgreSQL v16+ (méthode locale)
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

En runtime de déploiement (`NODE_ENV=production`), le backend refuse de démarrer si
`DEPLOYMENT_ENV` (`staging` ou `production`), `JWT_SECRET`, `DATABASE_URL`,
`FILE_ENCRYPTION_KEY`, `APP_URL` HTTPS et `PUBLIC_API_URL` HTTPS ne sont pas
fournis. Une cible `production` exige une configuration email valide et une
clé Stripe `sk_live_` ou `sk_test_` — le déploiement de démonstration tourne en
runtime production sans encaisser de paiement réel ; une cible `staging`
accepte uniquement une clé Stripe test (facultative pour conserver le paiement
simulé). Une clé malformée reste refusée dans les deux cas. Le seed de
démonstration est réservé aux environnements de développement et de test.

`NODE_ENV` décrit le runtime et ne doit pas servir à choisir le compte Stripe.
Pour Railway, définissez explicitement `NODE_ENV=production` et
`DEPLOYMENT_ENV=staging` sur l'environnement de test, ou
`DEPLOYMENT_ENV=production` sur l'environnement réel. Pendant la migration,
`RAILWAY_ENVIRONMENT_NAME`/`RAILWAY_ENVIRONMENT` n'est accepté comme secours
que si sa valeur est exactement `staging` ou `production`, et un conflit avec
`DEPLOYMENT_ENV` bloque le démarrage.

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
DEPLOYMENT_ENV=                     # staging ou production en deployment, vide en local
STRIPE_SECRET_KEY=sk_test_...        # voir section Paiements Stripe
STRIPE_WEBHOOK_SECRET=whsec_...      # voir section Paiements Stripe
FILE_ENCRYPTION_KEY=                 # openssl rand -hex 32
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=
EMAIL_PASS=
PORT=4000
PUBLIC_API_URL=http://localhost:4000  # origine qui sert les fichiers publics
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
Le backend utilise séparément `PUBLIC_API_URL` (par exemple
`https://api.sailingloc.fr`, sans chemin) pour construire les URL des photos et
avatars qu'il sert sous `/uploads`. Cette valeur est obligatoire en
staging/production et ne doit jamais être déduite de l'en-tête `Host`.
Dans Railway, le root directory du service frontend doit rester `/` (racine du
dépôt) : ne le remplacez pas par `/frontend`. Sélectionnez le fichier de
configuration `/frontend/railway.json` et
conservez le builder Dockerfile configuré par ce fichier. Le chemin explicite
`frontend/Dockerfile` permet à Railway de retrouver le Dockerfile dans ce
contexte racine. Définissez cette variable dans le service avant le premier
déploiement. Les variables publiques
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

| Email                 | Mot de passe |
| --------------------- | ------------ |
| `admin@sailingloc.fr` | Admin@123456 |

> **Connexion admin :** la page de login administrateur est séparée de celle des utilisateurs.
> URL : [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
> Une fois connecté, le dashboard est accessible sur [http://localhost:5173/admin](http://localhost:5173/admin).

### Compte Locataire

| Email                     | Mot de passe         |
| ------------------------- | -------------------- |
| `thomas.bernard@email.fr` | Locataire@2025Secure |

### Compte Propriétaire

| Email                 | Mot de passe            |
| --------------------- | ----------------------- |
| `luc.martin@email.fr` | Proprietaire@2025Secure |

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

### Cycle de vie d'un paiement

1. **Réservation** → création d'un `PaymentIntent` en **capture manuelle** (empreinte, non débité)
2. **Confirmation propriétaire** → **capture** du paiement
3. **Refus / annulation / expiration (7 j)** → libération de l'empreinte ou **remboursement**
4. **Litige** → remboursement partiel ou total décidé par l'admin
5. **Webhooks** (`/api/webhooks/stripe`) → synchronisation des statuts (`Payment`,
   `StripeWebhookEvent` pour l'idempotence), réconciliation des paiements

---

## Déploiement (Railway)

Le projet est déployé sur **Railway** avec trois services : **backend**,
**frontend** et une base **PostgreSQL** managée. Chaque service lit sa
configuration depuis un fichier `railway.json` versionné.

### Service backend — `backend/railway.json`

| Étape          | Commande                                                 |
| -------------- | -------------------------------------------------------- |
| Builder        | `RAILPACK`                                               |
| Build          | `npm run prisma:generate --workspace backend`            |
| Pre-deploy     | `npm run prisma:deploy --workspace backend` (migrations) |
| Start          | `NODE_ENV=production npm start --workspace backend`      |
| Health check   | `GET /health` (timeout 100 s)                            |
| Restart policy | `ON_FAILURE`, 10 tentatives                              |

### Service frontend — `frontend/railway.json`

- Builder **Dockerfile** (`frontend/Dockerfile`) — image multi-stage : build Vite
  puis **nginx non privilégié** (port interne `8080`) qui applique réellement les
  headers de sécurité et le **CSP**.
- **Root directory du service : `/`** (contexte racine du dépôt) — ne pas le
  passer à `/frontend`. Sélectionner le fichier de config `/frontend/railway.json`.
- Les variables `VITE_*` sont **figées dans le bundle au build** : elles doivent
  être définies **avant le premier déploiement**.
  - `VITE_API_BASE_URL` — URL API HTTPS publique **avec** `/api` (ex. `https://api.sailingloc.fr/api`), jamais `localhost`
  - `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_MATOMO_URL` — si ces intégrations sont activées

### Variables backend obligatoires en runtime production

Avec `NODE_ENV=production`, le backend **refuse de démarrer** si l'une des
variables suivantes manque ou est invalide :

`DEPLOYMENT_ENV` (`staging` **ou** `production`), `JWT_SECRET`, `DATABASE_URL`,
`FILE_ENCRYPTION_KEY`, `APP_URL` (HTTPS), `PUBLIC_API_URL` (HTTPS, sans chemin —
sert à construire les URL des photos/avatars sous `/uploads`).

- Cible **`staging`** → clé Stripe `sk_test_` uniquement (paiement simulé possible sans clé)
- Cible **`production`** → configuration email valide **et** clé Stripe `sk_live_`
  ou `sk_test_` (la démo tourne en runtime production sans encaisser de paiement réel)
- `RAILWAY_ENVIRONMENT_NAME` / `RAILWAY_ENVIRONMENT` ne sont acceptés en secours
  que s'ils valent exactement `staging` ou `production` ; un conflit avec
  `DEPLOYMENT_ENV` bloque le démarrage.
- `CORS_ORIGINS` (optionnelle) : origines frontend supplémentaires autorisées à
  envoyer le cookie de session, séparées par des virgules, toutes en HTTPS.

### Emails en production

Les ports SMTP sortants sont bloqués sur Railway : le backend bascule sur l'**API
HTTP Mailgun** dès que `MAILGUN_API_KEY` est renseignée (elle prend le pas sur
`EMAIL_*`). Renseigner aussi `MAILGUN_DOMAIN` et, pour la région EU,
`MAILGUN_HOST=api.eu.mailgun.net`.

### Webhooks Stripe en production

Déclarer l'endpoint `https://<domaine>/api/webhooks/stripe` dans
Dashboard → Developers → Webhooks, puis reporter le `whsec_…` fourni dans
`STRIPE_WEBHOOK_SECRET`.

### Alternative auto-hébergée

- `docker-compose.yml` — production (PostgreSQL + backend + frontend/nginx + Redis optionnel, ports non publiés sur le LAN)
- `docker-compose.staging.yml` — staging (`DEPLOYMENT_ENV=staging`, clé Stripe test)

Le Redis de production exige `REDIS_PASSWORD` (échec volontaire au démarrage si
absent). Les volumes `storage/documents` et `storage/disputes` sont persistants
et ne sont jamais servis par nginx.

---

## Tests

**56 fichiers de tests Jest** dans `backend/tests/` (+ **Supertest** pour les
tests HTTP de bout en bout). Les tests s'exécutent en ESM via
`cross-env NODE_OPTIONS=--experimental-vm-modules`. La logique métier est testée
au niveau des **services** (sans Express ni base réelle).

```bash
npm test                       # depuis la racine (workspace backend)
cd backend && npm test         # équivalent
cd backend && npm test -- --watch
```

### Domaines couverts

| Domaine                   | Exemples de fichiers                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sécurité**              | `securityAuth`, `securityAccess`, `securityRateCsrf`, `securityAbuse`, `securityPrivacy`, `securitySecrets`, `securityHttp`, `securityFavorites`, `fileCrypto`, `fileSecurity`             |
| **Réservation**           | `bookingService`, `proprietaireBookings`, `refuseExpiredPendingBookings`, `disputeRefund`                                                                                                  |
| **Paiement**              | `stripeWebhook`, `disputeRefund`, `invoice`                                                                                                                                                |
| **Crons de purge**        | `cronService`, `cronRunsPurge`, `tokensPurge`, `logsPurge`, `messagesPurge`, `imagesPurge`, `contactPurge`, `usersPurge`, `usersUnverifiedPurge`, `usersInactivePurge`, `usersPausedPurge` |
| **Accessibilité & thème** | `frontendDarkMode`, `frontendNightModeSurfaces`, `frontendColorVision*`, `frontendGlassSurfaces`, `frontendMapTheme`, `frontendVisualPreferences`, `frontendThemeIntegration`              |
| **SEO**                   | `frontendSeoHead`, `frontendSeoMetadata`, `frontendSeoStructuredData`, `frontendSeoStructure`, `frontendSeoFiles`                                                                          |
| **Compte & médias**       | `accountClosure`, `privateFileMigration`, `userAvatarMedia`, `portAdminMedia`, `adminBoatValidation`, `emailService`                                                                       |

Le pipeline `ci.yml` rejoue **lint + tests + build** à chaque push / PR sur
`master`, `develop` et `staging`.

---

## Scripts disponibles

### Racine

| Commande            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Environnement Docker de dev (`docker-compose.dev.yml`) |
| `npm run dev:build` | Idem avec rebuild des images                           |
| `npm run dev:down`  | Arrête l'environnement de dev                          |
| `npm run lint`      | Lint backend + frontend                                |
| `npm run format`    | Formatage backend + frontend                           |
| `npm test`          | Tests backend (Jest)                                   |

### Backend (`cd backend`)

| Commande                  | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Démarrage avec hot reload (nodemon)                 |
| `npm start`               | Démarrage en production                             |
| `npm test`                | Tests Jest (ESM)                                    |
| `npm run prisma:generate` | Génère le client Prisma                             |
| `npm run prisma:migrate`  | Applique les migrations (dev)                       |
| `npm run prisma:deploy`   | Applique les migrations (prod / Railway)            |
| `npm run files:migrate`   | Migration des fichiers privés en clair vers chiffré |
| `npm run lint`            | ESLint                                              |
| `npm run format`          | Prettier                                            |

### Frontend (`cd frontend`)

| Commande          | Description                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `npm run dev`     | Serveur de développement Vite                                              |
| `npm run build`   | Build de production (`prebuild` valide l'env, `postbuild` pré-rend le SEO) |
| `npm run preview` | Prévisualisation du build                                                  |
| `npm run lint`    | ESLint                                                                     |
| `npm run format`  | Prettier                                                                   |

---

## Structure du projet

```
SailingLoc_G2/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma, variables d'environnement
│   │   ├── controllers/     # Logique des routes HTTP
│   │   ├── services/        # Logique métier (paiement, cron, emails, stats…)
│   │   ├── repositories/    # Requêtes Prisma
│   │   ├── routes/          # Endpoints Express
│   │   ├── middlewares/     # JWT, rôles, rate-limit, CSRF, validation
│   │   ├── utils/           # Fonctions utilitaires
│   │   └── server.js        # Point d'entrée
│   ├── prisma/
│   │   ├── schema.prisma    # Schéma base de données
│   │   ├── migrations/      # Migrations SQL (32)
│   │   └── seed.js          # Données de démonstration (dev/test uniquement)
│   ├── scripts/             # Scripts de maintenance (migration fichiers privés…)
│   ├── storage/             # Fichiers privés chiffrés (documents, litiges) — hors statique
│   ├── uploads/             # Images bateaux / avatars (servi en statique)
│   ├── tests/               # Tests Jest (56 fichiers)
│   ├── railway.json         # Config du service backend Railway
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/          # Images, icônes, logos
│   │   ├── components/
│   │   │   ├── common/      # Composants UI réutilisables
│   │   │   └── features/    # Composants métier (Auth, Boats, Booking, Payment…)
│   │   ├── pages/           # Pages publiques + dashboards + back-office admin
│   │   ├── services/        # Appels API Axios
│   │   ├── context/         # État global (Auth, CookieConsent, Toast…)
│   │   ├── hooks/           # Hooks personnalisés (useAuth, useFavorites…)
│   │   ├── i18n/            # Traductions FR / EN (i18next)
│   │   ├── router/          # Configuration React Router
│   │   ├── security/        # Garde d'origine API
│   │   ├── utils/           # SEO, Matomo, préférences visuelles, formatage…
│   │   ├── main.jsx         # Point d'entrée React
│   │   └── index.css        # Styles globaux
│   ├── scripts/             # Pré-rendu SEO, sitemap, validation d'env de build
│   ├── Dockerfile           # Build Vite + nginx non privilégié (staging/prod)
│   └── railway.json         # Config du service frontend Railway
├── .github/workflows/           # ci.yml (intégration) + security.yml (portes de sécurité)
├── docs/                        # Audit SEO, accessibilité visuelle
├── docker-compose.yml           # Production auto-hébergée
├── docker-compose.dev.yml       # Développement (front + back + PostgreSQL + MailDev + Matomo)
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

Deux workflows s'exécutent automatiquement sur `master`, `develop` et `staging`
à chaque push ou pull request.

**`.github/workflows/ci.yml`** — intégration :

1. Lint (backend + frontend)
2. Tests Jest (backend), client Prisma généré au préalable
3. Build Vite (frontend) avec `VITE_API_BASE_URL` de production
4. Vérification du formatage Prettier des workflows
5. Jobs `deploy-staging` (`develop`/`staging`) et `deploy-production` (`master`)

**`.github/workflows/security.yml`** — portes de sécurité :

1. **`npm audit`** (prod + dev, seuil `high`) et génération de **SBOM** CycloneDX (racine, backend, frontend)
2. **Dependency review** sur les pull requests
3. **Secret scan** de l'arbre courant et **TruffleHog** sur tout l'historique Git
4. **CodeQL** (JavaScript / TypeScript, requêtes `security-and-quality`)
5. **Build + scan des images Docker** avec **Trivy** (secrets embarqués + vulnérabilités `HIGH`/`CRITICAL`)

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
