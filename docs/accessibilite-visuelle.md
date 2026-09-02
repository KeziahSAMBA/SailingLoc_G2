# Préférences visuelles et accessibilité

## Périmètre

SailingLoc conserve le rendu clair standard comme comportement par défaut. Les
préférences proposées dans le menu existant sont indépendantes :

- le thème `light` ou `dark` ;
- le profil de vision des couleurs `standard`, `protanopia`, `deuteranopia` ou
  `tritanopia`.

Les trois profils non standard restent combinables avec chacun des deux
thèmes. Ils modifient uniquement les tokens sémantiques des états, cartes,
calendriers et graphiques. Les photos, logos, vidéos, tuiles cartographiques,
routes, API, données, paiements et parcours métier ne sont pas filtrés ni
transformés.

## Persistance et priorité des préférences

La clé `sailingloc:visual-preferences:v1` est stockée dans `localStorage`. Les
valeurs sont normalisées à la lecture et à l’écriture ; toute valeur inconnue
revient au couple `light` + `standard`. Un script statique same-origin applique
ces attributs avant le montage React afin d’éviter un flash de thème. La
synchronisation entre onglets utilise l’événement `storage`.

Le thème clair n’est volontairement pas activé ou remplacé automatiquement par
`prefers-color-scheme`. Le choix manuel reste prioritaire. Quand `dark` est
actif, seul ce thème porte `color-scheme: dark`.

Les préférences système complémentaires sont respectées sans modifier le rendu
clair par défaut :

- `forced-colors: active` laisse le navigateur appliquer sa palette système et
  conserve les contours, formes, motifs et libellés accessibles ;
- `prefers-contrast: more` renforce l’indicateur de focus ;
- `prefers-reduced-motion: reduce` désactive les animations et transitions
  auteur et neutralise le défilement animé.

## Principes de rendu

Les informations d’état ne reposent pas sur la couleur seule :

- succès : contour plein renforcé et icône existante lorsqu’elle est déjà
  présente ;
- attente : contour en tirets ;
- erreur : contour double renforcé ;
- information : contour pointillé ;
- état neutre : contour plein fin.

Les jours du calendrier exposent `aria-selected`, `aria-disabled`, un libellé
complet et un état déterministe. La sélection utilise un double contour, la
disponibilité un contour plein et la désactivation un contour en tirets avec
motif. Les ports disponibles et indisponibles ont des formes de marqueur
différentes et un nom accessible. Le graphique de revenus conserve ses données
et sa géométrie, tout en fournissant un titre, une description et des traits ou
hachures différenciés.

## Critères de vérification

La vérification cible WCAG 2.2 niveau AA :

- texte courant : contraste d’au moins `4,5:1` ;
- grand texte et composants ou graphiques significatifs : au moins `3:1` ;
- focus visible et états compréhensibles sans distinguer une teinte ;
- fonctionnement au clavier, avec `Entrée`, `Espace` et `Échap` ;
- absence de boucle de focus, d’identifiant ARIA dupliqué ou d’élément
  interactif inaccessible ;
- contrôle des combinaisons clair/sombre et standard/profil, des viewports
  mobiles et desktop, du zoom et des couleurs forcées.

Les contrôles automatisés sont complétés par une vérification visuelle des
routes publiques, d’authentification, locataire, propriétaire et
administrateur. Les textes visibles, la structure, le placement et les
dimensions du thème clair standard restent la référence de non-régression.

## Références

- [WCAG 2.2 — W3C](https://www.w3.org/TR/WCAG22/)
- [Comprendre l’utilisation de la couleur (1.4.1) — W3C](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [Comprendre le contraste minimum (1.4.3) — W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Comprendre le contraste des éléments non textuels (1.4.11) — W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [`forced-colors` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/forced-colors)
- [`prefers-contrast` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-contrast)
- [`prefers-reduced-motion` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-reduced-motion)
