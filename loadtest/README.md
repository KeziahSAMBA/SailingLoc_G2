# Tests de montée en charge

Tests de charge du **backend** SailingLoc avec [k6](https://k6.io). k6 envoie des
requêtes HTTP et mesure les réponses : il n'exécute pas de JavaScript navigateur
et ne rend aucune page. Ce dispositif mesure donc la chaîne **API Express →
Prisma → PostgreSQL**, pas la performance perçue côté frontend (pour cela, voir
Lighthouse — autre outil, autre exercice).

## Cible

Railway staging : `https://sailinglocbackend-staging.up.railway.app`

**Jamais en production.** Un tir sature volontairement le service.

---

## 1. Préparer la cible (une fois)

### Variables d'environnement sur le service Railway

| Variable            | Valeur   | Effet                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `LOAD_TEST_MODE`    | `true`   | Neutralise le rate limiting, l'envoi d'emails et les tâches planifiées |
| `STRIPE_SECRET_KEY` | _(vide)_ | `getStripe()` renvoie `null`, le paiement passe en mode simulé         |

Puis **redéployer** pour qu'elles prennent effet. Au démarrage, les logs affichent :

```
[server] LOAD_TEST_MODE actif : rate limiting, emails et tâches planifiées désactivés.
```

Si cette ligne n'apparaît pas, le tir mesurera le rate limiting et sera à refaire.

### Ce que `LOAD_TEST_MODE` change

- **Rate limiting** — les sept limiteurs (`login` à 10/15 min, `register` à 5/5 min…)
  laissent passer. Sans cela, un tir depuis une seule machine, donc une seule IP,
  ne mesurerait que des `429` à partir de la 11ᵉ connexion.
- **Emails** — transport `jsonTransport` de nodemailer : le message est sérialisé
  puis jeté. Aucun envoi réel, et surtout aucune latence SMTP dans la mesure.
- **Tâches planifiées** — le scheduler ne démarre pas. Sinon les crons mutent les
  données pendant le tir et faussent les résultats, en particulier sur le profil
  d'endurance de 30 minutes.

> `LOAD_TEST_MODE` désactive des protections de sécurité. Il ne doit **jamais**
> être posé sur la production.

---

## 2. Injecter le jeu de données

Le staging ne contient qu'une cinquantaine de bateaux : un `findMany` dessus est
instantané quel que soit le code, aucun problème d'index n'apparaîtrait.

**Aucune commande à lancer.** Le seed est branché sur le `preDeployCommand` de
`backend/railway.json` : il s'exécute tout seul au déploiement, juste après les
migrations et le seed de démo. Il tourne alors depuis le réseau interne de
Railway, sans la latence du proxy public.

### Trois garde-fous

`railway.json` est versionné et sert à tous les environnements. Le script se
protège donc lui-même et **ne fait rien** sauf si les trois conditions sont
réunies :

| Condition                                   | Sinon                                                |
| ------------------------------------------- | ---------------------------------------------------- |
| `NODE_ENV` ≠ `production`                   | `Seed de charge ignoré : NODE_ENV=production.`       |
| `LOAD_TEST_MODE=true`                       | `Seed de charge ignoré : LOAD_TEST_MODE absent.`     |
| Aucun compte `@loadtest.local` déjà présent | `Seed de charge ignoré : N compte(s) déjà présents.` |

Conséquence : seul le **premier** déploiement après activation de
`LOAD_TEST_MODE` paie le coût du seed. Les suivants ne font qu'un `COUNT` et
passent leur tour — les déploiements ne s'allongent pas.

### Régénérer un jeu propre

Les scénarios locataire créent et suppriment des favoris ; pour repartir d'un
état identique entre deux campagnes, posez `LOAD_SEED_FORCE=true` sur le service
et redéployez. Le script supprime alors ses propres données (`@loadtest.local`,
préfixe `LT-`) et les recrée. **Retirez la variable ensuite**, sinon chaque
déploiement régénère 35 000 lignes.

### Vérifier

```bash
curl -s "https://sailinglocbackend-staging.up.railway.app/api/boats" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)), 'bateaux publiés')"
```

### Le lancer à la main malgré tout

Si vous préférez ne pas attendre un déploiement, prenez `DATABASE_PUBLIC_URL`
dans Railway → service **Postgres** → **Variables** (surtout pas `DATABASE_URL`,
qui pointe sur `postgres.railway.internal` et ne résout pas hors de leur réseau) :

```bash
cd backend
LOAD_TEST_MODE=true DATABASE_URL="postgresql://…@<hôte>.proxy.rlwy.net:<port>/railway" \
  npm run seed:load
```

Le script crée ~500 bateaux, ~20 000 réservations, leurs paiements et avis, puis
121 comptes. Il **supprime d'abord ses propres données** (tout ce qui porte le
domaine `@loadtest.local` ou le préfixe `LT-`) : il est rejouable à l'identique
pour repartir d'un état propre entre deux tirs.

Volumes ajustables : `LOAD_BOATS`, `LOAD_BOOKINGS`, `LOAD_GUESTS`, `LOAD_OWNERS`.

### Comptes créés

| Compte                           | Rôle         |
| -------------------------------- | ------------ |
| `admin@loadtest.local`           | admin        |
| `proprio1..20@loadtest.local`    | propriétaire |
| `locataire1..100@loadtest.local` | locataire    |

Mot de passe commun : `LoadTest!2026` (surchargeable par `LOAD_PASSWORD`).

---

## 3. Installer k6 (sur votre machine)

k6 est le **générateur de charge** : il s'installe côté client, pas sur Railway.
Trois voies, au choix. Ni la **b** (binaire dans `~/.local/bin`) ni la **c**
(Docker) ne demandent de droits d'administration.

> Sous WSL, un `k6` introuvable fait proposer `sudo snap install k6` par le shell.
> Mieux vaut décliner : snapd suppose systemd, absent de la plupart des WSL, et
> l'installation échoue ou laisse un binaire qui ne démarre pas.

### a. Dépôt apt — Debian / Ubuntu / WSL

```bash
sudo gpg -k && sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Le dépôt k6 publie une suite `stable` unique, indépendante du nom de code de la
distribution : la commande fonctionne aussi sur les Ubuntu récentes.

### b. Binaire seul — sans `sudo` _(voie retenue sur ce poste)_

Utile quand le serveur de clés est injoignable, ou simplement quand on n'a pas
les droits d'administration : le binaire va dans `~/.local/bin`, déjà présent
dans le `PATH`.

```bash
V=v2.2.0
cd /tmp
curl -fsSL -O "https://github.com/grafana/k6/releases/download/${V}/k6-${V}-linux-amd64.tar.gz"
curl -fsSL -O "https://github.com/grafana/k6/releases/download/${V}/k6-${V}-checksums.txt"

# Vérifier l'archive avant de l'exécuter
grep "k6-${V}-linux-amd64.tar.gz$" "k6-${V}-checksums.txt" | sha256sum -c -

tar xzf "k6-${V}-linux-amd64.tar.gz" --strip-components=1 -C /tmp "k6-${V}-linux-amd64/k6"
mkdir -p ~/.local/bin && install -m 755 /tmp/k6 ~/.local/bin/k6
```

La vérification `sha256sum -c` n'est pas décorative : on télécharge un exécutable
de 63 Mo depuis Internet pour le lancer ensuite. Elle doit afficher `OK`.

Si `k6` reste introuvable après l'installation, c'est que `~/.local/bin` n'est pas
dans le `PATH` — ajoutez `export PATH="$HOME/.local/bin:$PATH"` à votre `~/.bashrc`.

### c. Docker — sans rien installer

C'est la voie la plus courte : aucun paquet, aucun `sudo`.

```bash
docker run --rm -i -v "$PWD:/work" -w /work --user "$(id -u):$(id -g)" \
  grafana/k6 run -e PROFILE=smoke loadtest/k6/main.js
```

Les deux options sont indispensables, et pour des raisons différentes :

- `-v "$PWD:/work"` monte le dépôt dans le conteneur. Sans lui, les rapports
  seraient écrits dans le conteneur puis détruits avec lui.
- `--user "$(id -u):$(id -g)"` fait tourner k6 sous votre identité. L'image
  officielle s'exécute sous l'utilisateur `k6` (uid 12345), qui n'a pas le droit
  d'écrire dans `loadtest/rapports/`. Sans cette option, le tir se déroule
  normalement puis **échoue à la toute dernière seconde**, au moment d'écrire le
  rapport — après avoir consommé jusqu'à treize minutes de charge pour rien.

Pour alléger les commandes qui suivent, on peut poser un alias dans le shell :

```bash
alias k6='docker run --rm -i -v "$PWD:/work" -w /work --user "$(id -u):$(id -g)" grafana/k6'
```

Toutes les commandes `k6 run ...` de la section suivante fonctionnent alors telles
quelles. L'alias vit le temps du terminal.

### Vérifier

```bash
k6 version
```

---

## 4. Lancer les tirs

Depuis la **racine du dépôt** (les rapports s'écrivent dans `loadtest/rapports/`) :

```bash
# 1. Smoke — valide les scénarios, 1 minute. À passer en premier, toujours.
k6 run -e PROFILE=smoke loadtest/k6/main.js

# 2. Charge nominale — 50 VUs, 8 minutes
k6 run -e PROFILE=load loadtest/k6/main.js

# 3. Stress — montée jusqu'à 300 VUs, 13 minutes
k6 run -e PROFILE=stress loadtest/k6/main.js

# 4. Pic — 0 à 150 VUs en 10 secondes
k6 run -e PROFILE=spike loadtest/k6/main.js

# 5. Endurance — 20 VUs pendant 30 minutes
k6 run -e PROFILE=soak loadtest/k6/main.js
```

Options utiles :

```bash
k6 run -e PROFILE=load -e VUS=20 loadtest/k6/main.js        # calibrer la charge
k6 run -e PROFILE=smoke -e BASE_URL=http://localhost:4000 loadtest/k6/main.js
```

> **Calibrez avant de conclure.** En plan Railway Hobby, vous disposez d'environ
> 0,5 à 2 vCPU. Faites un premier `load` à `VUS=20` : si les seuils passent
> largement, montez. Sinon le rapport dira surtout que le plan est petit.

---

## 4 bis. Publier les résultats sur Grafana Cloud k6

Pour obtenir un **lien partageable** plutôt qu'un fichier HTML local — utile pour
un rendu ou une revue d'équipe.

### Compte et jeton

1. Créer un compte gratuit sur [grafana.com](https://grafana.com) (l'offre
   gratuite inclut 500 VU-heures par mois, très au-delà de nos besoins : la
   campagne complète en consomme moins de 60).
2. Dans Grafana Cloud → **Testing & synthetics → Performance**, récupérer le
   **jeton d'API k6** et l'identifiant de projet.
3. S'authentifier une fois. Le plus simple est le mode interactif, qui règle tout
   seul le jeton et la pile :

```bash
k6 cloud login
```

En non interactif, **les deux** valeurs sont obligatoires depuis k6 v2 :

```bash
k6 cloud login --token <VOTRE_JETON> --stack <VOTRE_PILE>
```

> **`stack value is required but it was not passed or is empty`**
> C'est l'erreur que renvoie `k6 cloud login --token …` employé seul : k6 v2
> rattache désormais chaque tir à une _pile_ Grafana Cloud, et le jeton ne suffit
> plus à la désigner. La pile est le sous-domaine de votre URL Grafana —
> pour `https://salimou.grafana.net`, c'est `salimou` (l'URL complète est acceptée
> aussi).

Pour vérifier ce qui est enregistré, ou repartir de zéro :

```bash
k6 cloud login -s   # affiche le jeton et la pile stockés
k6 cloud login -r   # réinitialise
```

Les identifiants sont écrits dans `~/.config/k6/config.json` : le jeton n'a donc
jamais à circuler dans les commandes qui suivent.

### Deux modes, selon d'où part la charge

```bash
# a. Exécution DANS le cloud Grafana : les VUs tournent sur leurs serveurs
k6 cloud run -e PROFILE=load loadtest/k6/main.js

# b. Exécution locale, résultats envoyés au cloud
k6 run --out cloud -e PROFILE=load loadtest/k6/main.js
```

|                      | Charge générée par   | Intérêt                                                                                            |
| -------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `k6 cloud run`       | les serveurs Grafana | Supprime la limite de votre machine (cf. limite n° 2 plus bas), charge distribuée sur plusieurs IP |
| `k6 run --out cloud` | votre machine        | Garde la maîtrise du réseau source, mais reste plafonné par votre poste                            |

Le mode **a** est recommandé pour les profils `stress` et `spike`, où un poste de
travail sature avant la cible.

Dans les deux cas, k6 affiche l'URL du tir au démarrage :

```
output: cloud (https://<votre-org>.grafana.net/a/k6-app/runs/1234567)
```

Pour un lien accessible sans compte, ouvrir le run dans l'interface et activer le
partage public.

### Ranger les tirs dans un projet

```bash
k6 cloud run -e PROFILE=load -e K6_CLOUD_PROJECT_ID=1234567 loadtest/k6/main.js
```

Chaque tir est nommé `SailingLoc — <profil>` dans le tableau de bord. Les seuils
définis dans `config.js` y apparaissent en réussite ou échec, comme en local.

> En exécution cloud, le rapport HTML **n'est pas généré** : le runner Grafana n'a
> pas l'arborescence du dépôt. Le script le détecte et n'écrit aucun fichier — le
> tableau de bord remplace le rapport. En local, les deux coexistent.

---

## 5. Lire le rapport

Chaque tir écrit deux fichiers dans `loadtest/rapports/` :

- `<profil>.html` — rapport lisible : verdict, métriques globales, tableau des
  seuils avec le mesuré face à l'attendu
- `<profil>.json` — métriques brutes, pour comparer deux tirs ou faire des courbes

Ces fichiers ne sont pas versionnés.

### Seuils appliqués

| Famille                                             |    p95 |    p99 |
| --------------------------------------------------- | -----: | -----: |
| Catalogue public (`/api/boats`, `/api/ports`, avis) | 400 ms | 800 ms |
| Détail bateau                                       | 500 ms |    1 s |
| Dashboards authentifiés                             | 700 ms |  1,5 s |
| Stats admin                                         |  1,5 s |    3 s |
| Écritures (favoris)                                 | 800 ms |    2 s |
| Connexion                                           |  1,5 s |    3 s |

Globaux : **erreurs HTTP < 1 %**, **checks > 99 %**, **aucun `429`**.

Le seuil `login` est volontairement haut : `bcrypt` à 12 tours coûte **~275 ms de
CPU par connexion**, mesuré sur ce projet. C'est un choix de sécurité délibéré,
pas un défaut — mais cela plafonne l'authentification à environ **4 connexions
par seconde et par process**, quelle que soit la concurrence.

---

## Répartition du trafic simulé

| Parcours           | Part | Contenu                                                      |
| ------------------ | ---: | ------------------------------------------------------------ |
| Visiteur anonyme   | 60 % | Catalogue, sections par type, ports, avis publics            |
| Locataire connecté | 25 % | Tableau de bord, réservations, paiements, favoris (écriture) |
| Propriétaire       | 10 % | Tableau de bord, bateaux, réservations reçues, revenus, avis |
| Administrateur     |  5 % | Statistiques, utilisateurs, réservations, journal            |

Les VUs s'authentifient **une seule fois dans `setup()`** et se partagent les
jetons. Se reconnecter à chaque itération reviendrait à mesurer bcrypt.

---

## Limites du dispositif, à mentionner dans tout rapport

1. **Railway a ses propres protections en frontal.** `LOAD_TEST_MODE` neutralise
   le rate limiting _applicatif_, pas celui de l'infrastructure. Des `429` ou
   `503` absents du compteur `rate_limited` viennent de Railway.
2. **Un seul générateur de charge.** Toutes les requêtes partent d'une seule IP,
   ce qui ne reproduit pas la distribution géographique d'un trafic réel. Au-delà
   d'environ 200 VUs depuis un poste de travail — a fortiori sous WSL, dont la
   pile réseau ajoute une indirection — c'est parfois **la machine de tir** qui
   sature avant la cible. Surveillez le CPU local pendant le profil `stress` : si
   k6 consomme un cœur entier, les latences mesurées ne sont plus imputables au
   serveur.
3. **Le frontend n'est pas mesuré** — voir l'avertissement en tête de ce fichier.
4. **`GET /api/boats` n'est pas paginé.** Le point d'entrée renvoie tous les
   bateaux publiés avec leurs images, équipements, disponibilités et l'intégralité
   de leurs réservations. Mesuré sur le staging : **158 Ko pour 48 bateaux**, soit
   ~3,3 Ko par bateau. À 500 bateaux la réponse pèse ~1,6 Mo, à 2 000 elle
   dépasserait 6 Mo — on mesurerait alors la bande passante et non l'application.
   C'est la raison du seed à 500 et non davantage.
