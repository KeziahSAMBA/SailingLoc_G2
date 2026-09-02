# Audit SEO — SailingLoc

## Synthèse

L’audit porte sur le périmètre public actuel de SailingLoc et sur les
optimisations qui peuvent être déployées sans modifier les routes, les API,
le modèle de données, le rendu visuel ou le fonctionnement métier. Le site
reste une application monopage (SPA) : les métadonnées de navigation sont
appliquées côté client, tandis que les fichiers d’exploration sont servis
comme ressources statiques.

Le domaine fourni, `https://dsp-dev-o24a-g2.com`, est traité comme un domaine
de staging. Son fichier `robots.txt` bloque donc volontairement toute
indexation. Le sitemap est néanmoins prêt avec les routes publiques stables
afin de pouvoir être réutilisé après validation du domaine public définitif.

## État initial observé

- `frontend/index.html` contenait un titre et une description génériques,
  sans canonical, balises Open Graph, Twitter Card ou politique robots
  pilotée par route.
- L’application utilise `BrowserRouter` et rend les pages dans le navigateur
  avec `createRoot` ; il n’y a pas de SSR ni de pré-rendu.
- Les pages publiques stables sont l’accueil, la catégorie, la page à propos,
  le contact et les quatre pages légales.
- Les fiches bateau, les résultats filtrés, les comptes, les réservations, les
  documents et les espaces administratifs sont dynamiques ou privés et ne
  doivent pas être ajoutés à un sitemap statique.
- Les images existantes ont déjà des noms suffisamment descriptifs pour le
  périmètre actuel. Une modification en masse pourrait casser des références,
  des caches ou des imports.

## Ciblage lexical recommandé

Les expressions sont utilisées avec parcimonie, dans des textes déjà visibles
ou dans les métadonnées. Elles ne doivent pas être répétées artificiellement.

| Page          | Intention principale                      | Expression cible                                 | Expressions secondaires                                 |
| ------------- | ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Accueil       | Découvrir le service                      | location de bateaux entre particuliers en France | louer un bateau, ports de France, sortie en mer         |
| Catégorie     | Rechercher une annonce                    | bateaux à louer en France                        | location de voilier, catamaran, jet-ski, port de départ |
| Fiche bateau  | Évaluer une offre précise                 | nom du bateau + type + ville                     | capacité, port, disponibilité, réservation              |
| À propos      | Comprendre la plateforme                  | location de bateaux entre particuliers           | mise en relation, propriétaires, voyageurs              |
| Contact       | Obtenir de l’aide                         | contact location de bateau                       | aide à la réservation, assistance                       |
| Pages légales | Consulter les informations réglementaires | informations légales SailingLoc                  | conditions, confidentialité, mentions légales           |

Les noms de bateaux, villes, types et capacités ne sont employés que lorsqu’ils
proviennent des données réellement chargées pour la fiche correspondante. Les
requêtes filtrées et les paramètres de recherche ne sont pas transformés en
pages SEO indexables.

## Modifications réalisées

### Métadonnées des routes existantes

- titres et descriptions distincts en français et en anglais pour les pages
  publiques stables ;
- balises `meta[name="description"]` et `meta[name="robots"]` ;
- URL canonical calculée depuis l’origine courante et le pathname, sans
  paramètres de recherche ;
- balises Open Graph et Twitter Card cohérentes avec le titre et la
  description ;
- `index,follow` pour les contenus publics stables ;
- `noindex,nofollow` pour les espaces privés, les routes inconnues, `/product`
  sans identifiant et les fiches produit inexistantes ;
- nettoyage des balises gérées lors d’une navigation, avec prévention des
  doublons et restauration des balises initiales.

### Fichiers d’exploration

- ajout de `frontend/public/robots.txt` avec `Disallow: /` pour le staging ;
- ajout d’un sitemap XML statique contenant uniquement les huit routes
  publiques stables existantes ;
- aucune date, fréquence ou priorité artificielle n’est déclarée.

## Périmètre volontairement exclu pour préserver le site

Les éléments suivants ne sont pas modifiés :

- routes, slugs, paramètres de navigation, API, base de données et migrations ;
- CSS, classes, dimensions, espacements, composants visuels et interactions ;
- déploiement, Docker, Railway, CSP, CORS, authentification et paiements ;
- pagination, filtres, recherche, carrousels et logique métier ;
- renommage, compression, recadrage ou remplacement des images actuelles ;
- ajout de dépendance, modification de bundle ou changement de stratégie SPA ;
- génération dynamique d’un sitemap depuis le backend ;
- correction du statut HTTP des routes inconnues, qui reste dépendante du
  fallback SPA existant.

## Convention future pour les images

Les futurs assets pourront suivre une convention descriptive, stable et
prévisible, par exemple :

`bateau-{nom-normalise}-{ville}-{vue}.{webp|jpg}`

Les noms doivent rester courts, en minuscules, sans accents ni espaces, avec
des tirets. Cette convention s’applique uniquement aux nouveaux fichiers ou
à une migration explicitement planifiée avec mise à jour atomique des
références. Les assets existants ne sont ni renommés ni modifiés dans cet
audit ; leurs dimensions et leur comportement restent inchangés.

## Limites et recommandations de mise en production

1. Le domaine de staging doit rester bloqué tant que le site n’est pas destiné
   à être indexé.
2. Avant ouverture au public, remplacer l’hôte de staging dans le sitemap par
   le domaine public canonique et définir une politique `robots.txt` validée.
   Vérifier aussi que les balises canonical générées utilisent ce même domaine
   lorsqu’il est effectivement servi.
3. Si une indexation complète des fiches bateau devient nécessaire, prévoir
   une stratégie SSR ou de pré-rendu séparée, avec une liste de fiches publiée
   depuis les données publiques et une gestion explicite des suppressions.
4. Contrôler après déploiement les réponses HTTP, les redirections, les
   certificats TLS, les erreurs d’exploration et les balises rendues par un
   navigateur réel.
5. Compléter ultérieurement les textes visibles et les H1 page par page après
   validation éditoriale, sans ajout de contenu caché ni bourrage de mots-clés.

## Validation effectuée

- test Jest déterministe des routes, titres, canonical et directives robots ;
- test Jest déterministe du format, du domaine et du périmètre du sitemap ;
- ESLint frontend réussi ;
- build frontend réussi avec une URL API de développement valide ;
- après build, `robots.txt` et `sitemap.xml` sont recopiés par Vite dans
  `frontend/dist/robots.txt` et `frontend/dist/sitemap.xml` ;
- aucune modification de route, API, CSS ou asset binaire dans ce périmètre.

## Conclusion client

Le périmètre déployé améliore la qualité des signaux SEO des pages déjà
existantes tout en conservant le fonctionnement et l’apparence du site. La
mise en indexation doit rester une décision distincte : elle ne devra être
activée qu’après confirmation du domaine public, des contenus à exposer et du
comportement attendu des pages dynamiques.
