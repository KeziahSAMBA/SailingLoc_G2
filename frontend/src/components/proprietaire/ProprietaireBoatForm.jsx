import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createBoat, getBoat, updateBoat } from '../../services/proprietaireService.js';
import { fetchPorts } from '../../services/portService.js';
import { getMyDocuments } from '../../services/documentService.js';
import { loadPortCatalog } from '../../utils/portCatalog.js';
import { useToast } from '../../hooks/useToast.jsx';

const DOC_STATUS_LABEL = {
  pending: 'en attente de vérification',
  validated: 'validé',
  refused: 'refusé',
};

const BOAT_TYPES = [
  { value: 'voilier', label: 'Voilier' },
  { value: 'catamaran', label: 'Catamaran' },
  { value: 'moteur', label: 'Bateau à moteur' },
  { value: 'peniche', label: 'Péniche' },
  { value: 'trimaran', label: 'Trimaran' },
  { value: 'hors_bord', label: 'Hors-bord' },
  { value: 'jet_ski', label: 'Jet-ski' },
  { value: 'gulet', label: 'Gulet' },
];

const MAX_PHOTOS = 5;

// Années de construction proposées : de l'année en cours jusqu'à 1900
// (un bateau ne peut pas avoir été construit dans le futur).
const BUILD_YEARS = Array.from(
  { length: new Date().getFullYear() + 1 - 1900 },
  (_, i) => new Date().getFullYear() - i
);

// Masque de saisie de l'immatriculation XX-XXX-000 : ne garde que les
// caractères valides à chaque position (lettres puis chiffres) et insère les
// tirets automatiquement pendant la frappe (pas à l'effacement, pour ne pas
// bloquer le retour arrière sur un tiret).
function formatRegistration(input, typing) {
  const chars = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('');
  let country = '';
  let port = '';
  let digits = '';
  for (const c of chars) {
    if (country.length < 2) {
      if (/[A-Z]/.test(c)) country += c;
    } else if (port.length < 3) {
      if (/[A-Z]/.test(c)) port += c;
    } else if (digits.length < 3) {
      if (/[0-9]/.test(c)) digits += c;
    }
  }
  let out = country;
  if (port || (typing && country.length === 2)) out += `-${port}`;
  if (digits || (typing && port.length === 3)) out += `-${digits}`;
  return out;
}

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';
const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#5AB4EC]';
const labelClass = 'mb-1 block text-xs font-medium text-white/70';
const cardClass = 'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5';

const EMPTY_AVAILABILITY = { start_date: '', end_date: '', price_override: '', notes: '' };

function ProprietaireBoatForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Mode édition : /proprietaire/bateaux/:id/modifier.
  const { id: editId } = useParams();
  // Statut du bateau édité : conditionne les boutons (brouillon ou annonce).
  const [editStatus, setEditStatus] = useState(null);

  const [form, setForm] = useState({
    name: '',
    type: 'voilier',
    registration: '',
    size: '',
    engine: '',
    daily_price: '',
    capacity: '',
    build_year: '',
    description: '',
    with_skipper: false,
    license_required: true,
  });

  // Port : suggestions parmi les ports en base ET le catalogue officiel des
  // ports français. Un port du catalogue absent de la base n'y est ajouté
  // qu'à la soumission (et seulement s'il n'existe pas déjà — côté serveur).
  const [ports, setPorts] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [portQuery, setPortQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState(null); // { source: 'db'|'catalog', ... }
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const portBoxRef = useRef(null);

  const [photos, setPhotos] = useState([]); // { file, preview } ou { id_image, preview, existing }
  // Acte de francisation : nouveau fichier à téléverser, OU document déjà
  // déposé choisi parmi ceux du propriétaire ; et celui rattaché au bateau (édition).
  const [acteFile, setActeFile] = useState(null);
  const [acteDocId, setActeDocId] = useState('');
  const [myActes, setMyActes] = useState([]);
  const [existingActe, setExistingActe] = useState(null);
  const [availabilities, setAvailabilities] = useState([{ ...EMPTY_AVAILABILITY }]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = editId ? 'Modifier mon bateau — SailingLoc' : 'Publier un bateau — SailingLoc';
  }, [editId]);

  useEffect(() => {
    fetchPorts()
      .then((res) => setPorts(res.data || []))
      .catch(() => setPorts([]));
  }, []);

  // Actes de francisation déjà déposés par le propriétaire, réutilisables
  // pour cette annonce (non rattachés à un autre bateau).
  useEffect(() => {
    getMyDocuments()
      .then((res) => {
        const docs = (res.data.documents || res.data || []).filter(
          (d) =>
            d.type === 'acte_francisation' &&
            (d.id_boat == null || d.id_boat === Number(editId || 0))
        );
        setMyActes(docs);
      })
      .catch(() => setMyActes([]));
  }, [editId]);

  // Mode édition : pré-remplit le formulaire depuis le brouillon existant.
  useEffect(() => {
    if (!editId) return;
    getBoat(editId)
      .then((res) => {
        const b = res.data.boat;
        setEditStatus(b.status);
        setForm({
          name: b.name || '',
          type: b.type || 'voilier',
          registration: b.registration || '',
          size: b.size != null ? String(b.size) : '',
          engine: b.engine || '',
          daily_price: b.daily_price != null ? String(b.daily_price) : '',
          capacity: b.capacity != null ? String(b.capacity) : '',
          build_year: b.build_year != null ? String(b.build_year) : '',
          description: b.description || '',
          with_skipper: Boolean(b.with_skipper),
          license_required: Boolean(b.license_required),
        });
        if (b.port) {
          setPortQuery(b.port.name);
          setSelectedPort({ ...b.port, source: 'db' });
        }
        setPhotos(
          (b.images || []).map((img) => ({
            id_image: img.id_image,
            preview: img.url,
            existing: true,
          }))
        );
        setExistingActe(b.acte_francisation || null);
        setAvailabilities(
          b.availabilities?.length
            ? b.availabilities.map((a) => ({
                start_date: a.start_date?.slice(0, 10) || '',
                end_date: a.end_date?.slice(0, 10) || '',
                price_override: a.price_override != null ? String(a.price_override) : '',
                notes: a.notes || '',
              }))
            : [{ ...EMPTY_AVAILABILITY }]
        );
      })
      .catch((err) => {
        showToast(err.response?.data?.message || 'Brouillon introuvable.', 'error');
        navigate('/proprietaire/bateaux');
      });
  }, [editId]);

  // Chargement paresseux du catalogue (~4 Mo) : au premier focus du champ port.
  const catalogRequested = useRef(false);
  function ensureCatalog() {
    if (catalogRequested.current) return;
    catalogRequested.current = true;
    loadPortCatalog()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }

  // Ferme la liste de suggestions au clic en dehors.
  useEffect(() => {
    const onClick = (e) => {
      if (portBoxRef.current && !portBoxRef.current.contains(e.target)) setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Libère les aperçus des nouvelles photos à la destruction du composant
  // (les photos existantes pointent vers le serveur, rien à libérer).
  useEffect(
    () => () => {
      photos.forEach((p) => !p.existing && URL.revokeObjectURL(p.preview));
    },
    []
  );

  // Suggestions fusionnées : ports en base d'abord, puis ceux du catalogue qui
  // n'y sont pas encore (dédupliqués par nom).
  const portSuggestions = useMemo(() => {
    const q = portQuery.trim().toLowerCase();
    if (!q) return [];
    const match = (p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    const db = ports.filter(match).map((p) => ({ ...p, source: 'db' }));
    const dbNames = new Set(ports.map((p) => p.name.toLowerCase()));
    const cat = (catalog || [])
      .filter((p) => match(p) && !dbNames.has(p.name.toLowerCase()))
      .map((p) => ({ ...p, source: 'catalog' }));
    return [...db, ...cat].slice(0, 8);
  }, [ports, catalog, portQuery]);

  // Port au nom exact (même sans clic sur la suggestion) : en base d'abord,
  // sinon dans le catalogue.
  const exactPort = useMemo(() => {
    const q = portQuery.trim().toLowerCase();
    const db = ports.find((p) => p.name.toLowerCase() === q);
    if (db) return { ...db, source: 'db' };
    const cat = (catalog || []).find((p) => p.name.toLowerCase() === q);
    return cat ? { ...cat, source: 'catalog' } : null;
  }, [ports, catalog, portQuery]);

  const resolvedPort = selectedPort || exactPort;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  // Immatriculation : masque XX-XXX-000 appliqué pendant la frappe.
  function handleRegistration(e) {
    const raw = e.target.value;
    setForm((prev) => ({
      ...prev,
      registration: formatRegistration(raw, raw.length > prev.registration.length),
    }));
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    const room = MAX_PHOTOS - photos.length;
    const kept = files.slice(0, room);
    if (files.length > room) {
      showToast(`Maximum ${MAX_PHOTOS} photos par annonce.`, 'error');
    }
    setPhotos((prev) => [
      ...prev,
      ...kept.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  }

  function removePhoto(index) {
    setPhotos((prev) => {
      if (!prev[index].existing) URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function setAvailability(index, field, value) {
    setAvailabilities((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  }

  async function handleSubmit(e, draft = false) {
    e.preventDefault();
    setServerError('');

    // Pas de création libre : le port doit venir de la base ou du catalogue.
    // Un brouillon peut en revanche être enregistré sans port.
    if (!resolvedPort && !draft) {
      setServerError("Sélectionnez un port d'attache dans la liste.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (!resolvedPort) {
      // Brouillon sans port : rien à envoyer.
    } else if (resolvedPort.source === 'db') {
      data.append('id_port', resolvedPort.id_port);
    } else {
      // Port du catalogue : le serveur le réutilise s'il est déjà en base
      // (même nom), sinon il le crée avec ses coordonnées et son code INSEE.
      data.append('port_name', resolvedPort.name);
      data.append('port_city', resolvedPort.city);
      data.append('port_country', resolvedPort.country || 'France');
      if (resolvedPort.insee) data.append('port_insee', resolvedPort.insee);
      if (resolvedPort.latitude != null) data.append('port_latitude', resolvedPort.latitude);
      if (resolvedPort.longitude != null) data.append('port_longitude', resolvedPort.longitude);
    }
    // Périodes remplies uniquement (les lignes vides sont ignorées).
    const filled = availabilities.filter((a) => a.start_date && a.end_date);
    data.append('availabilities', JSON.stringify(filled));
    // Édition : ids des photos existantes conservées (dans l'ordre) ;
    // les nouveaux fichiers s'ajoutent à la suite.
    if (editId) {
      data.append(
        'existing_images',
        JSON.stringify(photos.filter((p) => p.existing).map((p) => p.id_image))
      );
    }
    photos.filter((p) => !p.existing).forEach((p) => data.append('images', p.file));
    // Acte de francisation : nouveau fichier prioritaire, sinon document existant choisi.
    if (acteFile) data.append('acte_francisation', acteFile);
    else if (acteDocId) data.append('acte_francisation_id', acteDocId);
    if (draft) data.append('draft', 'true');

    setSubmitting(true);
    try {
      const res = editId ? await updateBoat(editId, data) : await createBoat(data);
      const finalStatus = res.data.boat?.status;
      showToast(
        draft
          ? 'Brouillon enregistré.'
          : finalStatus === 'published'
            ? 'Annonce mise à jour.'
            : editStatus === 'published'
              ? 'Annonce envoyée en revalidation : elle sera de nouveau visible après vérification.'
              : 'Annonce soumise ! Elle sera visible après validation par notre équipe.',
        'success'
      );
      navigate('/proprietaire/bateaux');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Une erreur est survenue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="boat-form-title" className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h1 id="boat-form-title" className="text-2xl font-bold text-white">
          {!editId
            ? 'Publier un bateau'
            : editStatus === 'draft'
              ? 'Modifier mon brouillon'
              : 'Modifier mon annonce'}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {!editId
            ? 'Décrivez votre bateau : l’annonce sera vérifiée par notre équipe avant publication.'
            : editStatus === 'draft'
              ? 'Complétez votre brouillon, puis soumettez-le pour validation quand il est prêt.'
              : editStatus === 'published'
                ? 'Prix, port et disponibilités s’appliquent immédiatement. Toute autre modification enverra l’annonce en revalidation par notre équipe.'
                : 'Après modification, l’annonce sera (re)soumise à la validation de notre équipe.'}
        </p>
      </header>

      {serverError && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {serverError}
        </div>
      )}

      {/* Validation navigateur active pour la soumission ; le brouillon (bouton
          type=button) passe outre et laisse le backend valider. */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
        {/* Caractéristiques */}
        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-white/90">Caractéristiques</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={labelClass}>
                Nom du bateau *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Ex. : Le Mistral"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="type" className={labelClass}>
                Type *
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className={inputClass}
              >
                {BOAT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="registration" className={labelClass}>
                Immatriculation *
              </label>
              <input
                id="registration"
                name="registration"
                type="text"
                required
                value={form.registration}
                onChange={handleRegistration}
                pattern="[A-Z]{2}-[A-Z]{3}-[0-9]{3}"
                title="Format : 2 lettres (pays), 3 lettres (port), 3 chiffres — ex. FR-MRS-042"
                placeholder="Ex. : FR-MRS-042"
                aria-describedby="registration-hint"
                className={inputClass}
              />
              <small id="registration-hint" className="mt-1 block text-xs text-white/60">
                Format : XX-XXX-000 (pays, port, numéro).
              </small>
            </div>

            <div>
              <label htmlFor="size" className={labelClass}>
                Taille (mètres) *
              </label>
              <input
                id="size"
                name="size"
                type="number"
                min="1"
                step="0.1"
                required
                value={form.size}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="capacity" className={labelClass}>
                Capacité (personnes) *
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                step="1"
                required
                value={form.capacity}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="daily_price" className={labelClass}>
                Prix par jour (€) *
              </label>
              <input
                id="daily_price"
                name="daily_price"
                type="number"
                min="1"
                step="1"
                required
                value={form.daily_price}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="build_year" className={labelClass}>
                Année de construction
              </label>
              <select
                id="build_year"
                name="build_year"
                value={form.build_year}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Non renseignée</option>
                {BUILD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="engine" className={labelClass}>
                Motorisation
              </label>
              <input
                id="engine"
                name="engine"
                type="text"
                value={form.engine}
                onChange={handleChange}
                placeholder="Ex. : Diesel 30cv"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                placeholder="Présentez votre bateau aux locataires…"
                className={inputClass}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
              <input
                type="checkbox"
                name="with_skipper"
                checked={form.with_skipper}
                onChange={handleChange}
                className="h-4 w-4 accent-[#5AB4EC]"
              />
              <span>
                Skipper proposé{' '}
                <span className="text-xs text-white/60">(CV marin requis dans Mes documents)</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
              <input
                type="checkbox"
                name="license_required"
                checked={form.license_required}
                onChange={handleChange}
                className="h-4 w-4 accent-[#5AB4EC]"
              />
              Permis bateau requis
            </label>
          </div>
        </section>

        {/* Port d'attache */}
        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-white/90">Port d&apos;attache</h2>

          <div ref={portBoxRef} className="relative">
            <label htmlFor="port" className={labelClass}>
              Port *
            </label>
            <input
              id="port"
              type="text"
              role="combobox"
              aria-expanded={suggestionsOpen && portSuggestions.length > 0}
              aria-autocomplete="list"
              autoComplete="off"
              required
              value={portQuery}
              onChange={(e) => {
                setPortQuery(e.target.value);
                setSelectedPort(null);
                setSuggestionsOpen(true);
              }}
              onFocus={() => {
                setSuggestionsOpen(true);
                ensureCatalog();
              }}
              placeholder="Ex. : Port de Marseille"
              className={inputClass}
            />

            {suggestionsOpen && portSuggestions.length > 0 && !selectedPort && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-white/20 bg-slate-900/95 shadow-xl backdrop-blur-xl">
                {portSuggestions.map((p) => (
                  <li key={`${p.source}-${p.id_port ?? p.name}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPort(p);
                        setPortQuery(p.name);
                        setSuggestionsOpen(false);
                      }}
                      className="block w-full truncate px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                    >
                      {p.name} <span className="text-white/60">— {p.city}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {suggestionsOpen && portQuery.trim() && catalog === null && (
              <p className="mt-1 text-xs text-white/60">Chargement du catalogue des ports…</p>
            )}
          </div>

          {resolvedPort && (
            <p className="mt-2 text-xs text-emerald-300">
              ✓ Port sélectionné : {resolvedPort.name} ({resolvedPort.city})
            </p>
          )}

          {!resolvedPort && portQuery.trim().length > 0 && (
            <p className="mt-2 text-xs text-amber-300">Sélectionnez un port dans la liste.</p>
          )}
        </section>

        {/* Photos */}
        <section className={cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-white/90">Photos</h2>
          <p className="mb-4 text-xs text-white/60">
            Jusqu&apos;à {MAX_PHOTOS} photos (JPG, PNG ou WebP, 5 Mo max chacune). La première sera
            la photo principale de l&apos;annonce.
          </p>

          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={p.preview} className="relative">
                <img
                  src={p.preview}
                  alt={`Photo ${i + 1}${i === 0 ? ' (principale)' : ''}`}
                  className="h-24 w-32 rounded-lg object-cover"
                />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Principale
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Supprimer la photo ${i + 1}`}
                  className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow transition hover:bg-red-500 ${FOCUS_RING}`}
                >
                  ×
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <label
                className={`flex h-24 w-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/40 text-sm text-white/70 transition hover:border-[#5AB4EC] hover:text-white/90 ${FOCUS_RING}`}
              >
                + Ajouter
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotos}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </section>

        {/* Documents du bateau */}
        <section className={cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-white/90">Documents du bateau</h2>
          <p className="mb-4 text-xs text-white/60">
            Acte de francisation (carte d&apos;enregistrement du bateau) — PDF, JPG ou PNG, 5 Mo
            max. Il sera vérifié par notre équipe et n&apos;est jamais visible des locataires.
          </p>

          {/* Acte de francisation actuellement rattaché au bateau (édition). */}
          {existingActe && !acteFile && !acteDocId && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">
              <span className="min-w-0 truncate">{existingActe.file_name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  existingActe.status === 'validated'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : existingActe.status === 'refused'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {existingActe.status === 'validated'
                  ? 'Validé'
                  : existingActe.status === 'refused'
                    ? 'Refusé'
                    : 'En attente de vérification'}
              </span>
            </div>
          )}

          {acteFile ? (
            /* Nouveau fichier choisi : il sera vérifié par l'équipe. */
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 truncate rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">
                {acteFile.name}{' '}
                <span className="text-xs text-amber-300">(sera vérifié par notre équipe)</span>
              </span>
              <button
                type="button"
                onClick={() => setActeFile(null)}
                className={`rounded-full border border-white/40 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                Retirer
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {/* Option 1 : réutiliser un acte de francisation déjà déposé. */}
              {myActes.length > 0 && (
                <div className="min-w-0">
                  <label htmlFor="acte-existant" className={labelClass}>
                    Utiliser un acte de francisation déjà déposé
                  </label>
                  <select
                    id="acte-existant"
                    value={acteDocId}
                    onChange={(e) => setActeDocId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Choisir —</option>
                    {myActes.map((d) => (
                      <option key={d.id_document} value={d.id_document}>
                        {d.file_name} ({DOC_STATUS_LABEL[d.status] || d.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Option 2 : en déposer un nouveau, qui sera vérifié. */}
              {!acteDocId && (
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 self-end rounded-full border border-dashed border-white/40 px-4 py-2 text-sm text-white/70 transition hover:border-[#5AB4EC] hover:text-white/90 ${FOCUS_RING}`}
                >
                  {myActes.length > 0
                    ? 'ou en déposer un nouveau (sera vérifié)'
                    : existingActe
                      ? 'Remplacer l’acte de francisation (sera vérifié)'
                      : '+ Ajouter l’acte de francisation (sera vérifié)'}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setActeFile(file);
                        setActeDocId('');
                      }
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          )}

          {/* Découvrabilité de l'option « acte existant » quand il n'y en a aucun. */}
          {myActes.length === 0 && !acteFile && !existingActe && (
            <p className="mt-3 text-xs text-white/60">
              Astuce : les actes de francisation déposés dans{' '}
              <Link
                to="/proprietaire/documents"
                className={`text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
              >
                Mes documents
              </Link>{' '}
              sont réutilisables ici — chacun ne peut être rattaché qu&apos;à une seule annonce.
            </p>
          )}
        </section>

        {/* Disponibilités */}
        <section className={cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-white/90">Disponibilités</h2>
          <p className="mb-4 text-xs text-white/60">
            Périodes pendant lesquelles le bateau peut être loué. Le prix spécifique remplace le
            prix par jour sur la période (haute saison, promotion…).
          </p>

          <ul className="space-y-3">
            {availabilities.map((a, i) => (
              <li
                key={i}
                className="grid items-end gap-3 rounded-lg border border-white/20 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
              >
                <div>
                  <label htmlFor={`avail-start-${i}`} className={labelClass}>
                    Du
                  </label>
                  <input
                    id={`avail-start-${i}`}
                    type="date"
                    value={a.start_date}
                    onChange={(e) => setAvailability(i, 'start_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`avail-end-${i}`} className={labelClass}>
                    Au
                  </label>
                  <input
                    id={`avail-end-${i}`}
                    type="date"
                    value={a.end_date}
                    min={a.start_date || undefined}
                    onChange={(e) => setAvailability(i, 'end_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`avail-price-${i}`} className={labelClass}>
                    Prix spécifique (€)
                  </label>
                  <input
                    id={`avail-price-${i}`}
                    type="number"
                    min="1"
                    value={a.price_override}
                    onChange={(e) => setAvailability(i, 'price_override', e.target.value)}
                    placeholder="Optionnel"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`avail-notes-${i}`} className={labelClass}>
                    Note
                  </label>
                  <input
                    id={`avail-notes-${i}`}
                    type="text"
                    value={a.notes}
                    onChange={(e) => setAvailability(i, 'notes', e.target.value)}
                    placeholder="Optionnel"
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAvailabilities((prev) => prev.filter((_, j) => j !== i))}
                  disabled={availabilities.length === 1}
                  aria-label={`Supprimer la période ${i + 1}`}
                  className={`h-9 rounded-lg border border-white/30 px-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setAvailabilities((prev) => [...prev, { ...EMPTY_AVAILABILITY }])}
            className={`mt-3 rounded-full border border-white/40 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
          >
            + Ajouter une période
          </button>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate('/proprietaire/bateaux')}
            className={`rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
          >
            Annuler
          </button>
          {/* « Enregistrer en brouillon » : uniquement en création ou sur un brouillon. */}
          {(!editId || editStatus === 'draft') && (
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, true)}
              className={`rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
            >
              Enregistrer en brouillon
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {submitting
              ? 'Envoi…'
              : !editId || editStatus === 'draft'
                ? 'Soumettre pour validation'
                : editStatus === 'published'
                  ? 'Enregistrer les modifications'
                  : 'Soumettre à nouveau'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProprietaireBoatForm;
