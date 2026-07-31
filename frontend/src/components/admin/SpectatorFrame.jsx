import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Raccourcis vers les pages publiques utiles à inspecter en mode spectateur.
const QUICK_LINKS = [
  { labelKey: 'spectatorFrame.linkHome', path: '/' },
  { labelKey: 'spectatorFrame.linkLogin', path: '/login' },
  { labelKey: 'spectatorFrame.linkRegister', path: '/register' },
];

function normalizePath(value) {
  const v = String(value || '').trim();
  if (!v) return '/';
  // Refuse les URLs externes (protocol-relative ou avec schéma) pour empêcher
  // de charger un site tiers dans l'iframe admin (phishing / contenu non maîtrisé).
  if (v.startsWith('//') || /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(v)) return '/';
  return v.startsWith('/') ? v : `/${v}`;
}

// Force le mode spectateur dans l'iframe : ajoute ?spectator=<mode> (ou
// &spectator=<mode> si l'admin a déjà tapé des query params). AuthContext lit
// ce flag au boot pour ne pas restaurer la session admin dans l'iframe (et
// afficher un faux compte de démo si le mode correspond à un rôle).
function withSpectator(p, mode) {
  if (!p) return `/?spectator=${mode}`;
  const [pathPart, queryPart = ''] = p.split('?');
  const params = new URLSearchParams(queryPart);
  params.set('spectator', mode);
  return `${pathPart}?${params.toString()}`;
}

/**
 * Aperçu live du site public (ou d'un faux compte de démo) dans une iframe,
 * embarqué dans l'espace admin. Partagé par les pages "Vue locataire" et
 * "Vue propriétaire" — chacune fixe son propre `mode` et son propre contenu
 * de bannière, et peut diverger librement au-delà de ce socle commun.
 */
function SpectatorFrame({ mode, title, description, banner }) {
  const { t } = useTranslation();
  // `path` = ce qui est dans la barre d'adresse (édité par l'admin).
  // `src` = ce qui est réellement chargé dans l'iframe (validé par submit).
  const [path, setPath] = useState('/');
  const [src, setSrc] = useState('/');
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef(null);

  function go(newPath) {
    const clean = normalizePath(newPath);
    setPath(clean);
    setSrc(clean);
  }

  function handleSubmit(e) {
    e.preventDefault();
    go(path);
  }

  function refresh() {
    // Forcer un reload même si la même URL est demandée : on remet src à vide
    // puis on le repose au prochain tick.
    setSrc('');
    setTimeout(() => setSrc(normalizePath(path)), 0);
  }

  // URL réellement injectée dans l'iframe (toujours en mode spectateur : le
  // login depuis l'iframe est bloqué par AuthContext pour ne pas écraser la
  // session admin du parent).
  const iframeSrc = src ? withSpectator(src, mode) : '';

  // ESC pour sortir du plein écran.
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Barre d'URL réutilisée dans les deux modes (in-page et fullscreen).
  const urlBar = (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap"
    >
      <button
        type="button"
        onClick={refresh}
        title={t('spectatorFrame.reload')}
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
      >
        ⟳
      </button>
      <div className="flex min-w-0 sm:flex-1">
        <span className="hidden max-w-[45%] truncate rounded-l-lg border border-r-0 border-white/30 bg-white/10 px-3 py-2 text-xs text-white/60 md:block">
          {window.location.origin}
        </span>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/"
          className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5AB4EC] md:rounded-l-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500/90"
      >
        {t('spectatorFrame.go')}
      </button>
      <div className="col-span-3 flex max-w-full items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:w-full sm:pb-0 lg:w-auto lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {QUICK_LINKS.map(({ labelKey, path: p }) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              src === p
                ? 'bg-sky-500 text-white'
                : 'border border-white/30 text-white/80 hover:bg-white/10'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </form>
  );

  // Mode plein écran : on échappe au layout admin via un overlay fixed.
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-white">
            {title} — {t('spectatorFrame.fullscreenSuffix')}
          </h1>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            {t('spectatorFrame.exit')}
          </button>
        </div>
        <div className="mb-3">{urlBar}</div>
        <div className="flex-1 overflow-hidden rounded-2xl border border-white/20 bg-white">
          {src ? (
            <iframe
              ref={iframeRef}
              key={iframeSrc}
              src={iframeSrc}
              title={t('spectatorFrame.iframeTitle')}
              className="block h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/60">
              {t('spectatorFrame.reloading')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-white/70">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-sky-500/90"
        >
          {t('spectatorFrame.fullscreen')}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
        {banner}
      </div>

      <div className="mt-3">{urlBar}</div>

      {/* Cadre de l'iframe — hauteur calculée pour utiliser tout l'espace dispo
          sous la chrome (header fixe 100px, padding layout, chrome de la page). */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/20 bg-white">
        {src ? (
          <iframe
            ref={iframeRef}
            key={iframeSrc}
            src={iframeSrc}
            title={t('spectatorFrame.iframeTitle')}
            className="block w-full"
            style={{ height: 'calc(100vh - 320px)', minHeight: '600px' }}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center text-sm text-white/60"
            style={{ height: 'calc(100vh - 320px)', minHeight: '600px' }}
          >
            Rechargement…
          </div>
        )}
      </div>
    </section>
  );
}

export default SpectatorFrame;
