---
name: verify
description: Recette de vérification end-to-end du frontend SailingLoc (stack docker dev + Playwright)
---

# Vérifier SailingLoc en conditions réelles

## Lancer / trouver l'app

- `npm run dev` à la racine = `docker compose -f docker-compose.dev.yml up` (postgres :5433, backend :4000, frontend :5173, maildev :1080, pgadmin :5050). Le stack tourne souvent déjà — vérifier avec `docker ps` avant de relancer.
- Le code frontend est bind-mounté dans le conteneur (`./frontend:/app`) avec Vite HMR : les modifications locales sont visibles immédiatement sur http://localhost:5173, pas besoin de rebuild.
- Le backend seed la base au démarrage (~48 bateaux, ports français) : les données sont réelles.

## Piloter le navigateur

- Playwright est dans `frontend/devDependencies` (chromium déjà installé). Écrire un script `.mjs` **dans `frontend/`** (résolution node_modules) et le supprimer après.
- Screenshots headless : ~500-700 ms chacun sur ces pages (grosses images + backdrop-filter). Trop lent pour capturer une animation.
- Pour capturer des animations/transitions frame par frame : screencast CDP —
  `page.context().newCDPSession(page)` puis `Page.startScreencast` (jpeg, everyNthFrame: 2), ack chaque frame avec `Page.screencastFrameAck`. ~12 fps réels, suffisant pour vérifier un mouvement.
- `page.emulateMedia({ reducedMotion: 'reduce' })` pour tester les chemins prefers-reduced-motion.

## Pièges connus

- **StrictMode est actif** ([main.jsx](frontend/src/main.jsx)) : en dev les initialiseurs useState et les effets sont doublés — tout état module-level « consommé » au montage doit être lu sans effet de bord et nettoyé dans un useEffect (voir `useCategoryTransition.js`).
- Deux erreurs console 401 au chargement anonyme (check de session AuthContext) : préexistant, pas un symptôme.
- Le lint exige le préfixe `window.` sur les APIs navigateur (requestAnimationFrame, CustomEvent, Image…).
