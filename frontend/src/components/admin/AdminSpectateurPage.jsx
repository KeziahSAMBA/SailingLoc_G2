import { useState, useRef, useEffect } from 'react';

// Raccourcis vers les pages publiques utiles à inspecter en mode spectateur.
const QUICK_LINKS = [
  { label: 'Accueil', path: '/' },
  { label: 'Connexion', path: '/login' },
  { label: 'Inscription', path: '/register' },
];

function normalizePath(value) {
  const v = String(value || '').trim();
  if (!v) return '/';
  return v.startsWith('/') ? v : `/${v}`;
}

// Force le mode spectateur dans l'iframe : ajoute ?spectator=1 (ou
// &spectator=1 si l'admin a déjà tapé des query params). AuthContext lit ce
// flag au boot pour ne pas restaurer la session admin dans l'iframe.
function withSpectator(p) {
  if (!p) return '/?spectator=1';
  const [pathPart, queryPart = ''] = p.split('?');
  const params = new URLSearchParams(queryPart);
  params.set('spectator', '1');
  return `${pathPart}?${params.toString()}`;
}

function AdminSpectateurPage() {
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

  // URL réellement injectée dans l'iframe (toujours en mode spectateur visiteur :
  // le login depuis l'iframe est bloqué par AuthContext pour ne pas écraser la
  // session admin du parent).
  const iframeSrc = src ? withSpectator(src) : '';

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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={refresh}
        title="Recharger l'aperçu"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
      >
        ⟳
      </button>
      <span className="rounded-l-lg border border-r-0 border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-500">
        {window.location.origin}
      </span>
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="/"
        className="-ml-2 min-w-[160px] flex-1 rounded-r-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#5AB4EC]"
      />
      <button
        type="submit"
        className="rounded-lg bg-[#0A3172] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A3172]/90"
      >
        Aller
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_LINKS.map(({ label, path: p }) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              src === p
                ? 'bg-[#0A3172] text-white'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {label}
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
          <h1 className="text-lg font-bold text-white">Vue spectateur — plein écran</h1>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="rounded-full bg-slate-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-600"
          >
            ✕ Quitter (Esc)
          </button>
        </div>
        <div className="mb-3">{urlBar}</div>
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-white">
          {src ? (
            <iframe
              ref={iframeRef}
              key={iframeSrc}
              src={iframeSrc}
              title="Aperçu site public"
              className="block h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Rechargement…
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
          <h1 className="text-2xl font-bold text-white">Vue spectateur</h1>
          <p className="mt-1 text-sm text-slate-400">
            Aperçu live du site public à l'intérieur de l'espace admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="rounded-full bg-[#0A3172] px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-[#0A3172]/90"
        >
          ⛶ Plein écran
        </button>
      </div>

      {/* Vue spectateur = visiteur uniquement. Le login depuis l'iframe est
          désactivé pour ne pas écraser le cookie admin du parent. */}
      <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
        👁️ Vue <strong>visiteur non connecté</strong>. La connexion réelle depuis l'iframe est
        désactivée. Pour tester un compte locataire/propriétaire, ouvrez un{' '}
        <strong>onglet privé</strong> de votre navigateur.
      </div>

      <div className="mt-3">{urlBar}</div>

      {/* Cadre de l'iframe — hauteur calculée pour utiliser tout l'espace dispo
          sous la chrome (header fixe 100px, padding layout, chrome de la page). */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-white">
        {src ? (
          <iframe
            ref={iframeRef}
            key={iframeSrc}
            src={iframeSrc}
            title="Aperçu site public"
            className="block w-full"
            style={{ height: 'calc(100vh - 320px)', minHeight: '600px' }}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center text-sm text-slate-500"
            style={{ height: 'calc(100vh - 320px)', minHeight: '600px' }}
          >
            Rechargement…
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminSpectateurPage;
