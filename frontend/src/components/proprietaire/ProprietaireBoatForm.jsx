import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createBoat, getBoat, updateBoat } from '../../services/proprietaireService.js';
import { fetchPorts } from '../../services/portService.js';
import { getMyDocuments } from '../../services/documentService.js';
import { loadPortCatalog } from '../../utils/portCatalog.js';
import { useToast } from '../../hooks/useToast.jsx';

const BOAT_TYPES = [
  'voilier',
  'catamaran',
  'moteur',
  'peniche',
  'trimaran',
  'hors_bord',
  'jet_ski',
  'gulet',
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
  const { t } = useTranslation();
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
    document.title = editId
      ? t('proprietaireBoatForm.pageTitleEdit')
      : t('proprietaireBoatForm.pageTitleCreate');
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
        showToast(err.response?.data?.message || t('proprietaireBoatForm.draftNotFound'), 'error');
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
      setServerError(t('proprietaireBoatForm.portRequired'));
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
          ? t('proprietaireBoatForm.draftSaved')
          : finalStatus === 'published'
            ? t('proprietaireBoatForm.listingUpdated')
            : editStatus === 'published'
              ? t('proprietaireBoatForm.listingResubmitted')
              : t('proprietaireBoatForm.listingSubmitted'),
        'success'
      );
      navigate('/proprietaire/bateaux');
    } catch (err) {
      setServerError(err.response?.data?.message || t('proprietaireBoatForm.genericError'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="boat-form-title" className="w-full">
      <header className="mb-6">
        <h1 id="boat-form-title" className="text-2xl font-bold text-white">
          {!editId
            ? t('proprietaireBoatForm.titleCreate')
            : editStatus === 'draft'
              ? t('proprietaireBoatForm.titleEditDraft')
              : t('proprietaireBoatForm.titleEdit')}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {!editId
            ? t('proprietaireBoatForm.subtitleCreate')
            : editStatus === 'draft'
              ? t('proprietaireBoatForm.subtitleDraft')
              : editStatus === 'published'
                ? t('proprietaireBoatForm.subtitlePublished')
                : t('proprietaireBoatForm.subtitleEdit')}
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
          <h2 className="mb-4 text-sm font-semibold text-white/90">
            {t('proprietaireBoatForm.featuresTitle')}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={labelClass}>
                {t('proprietaireBoatForm.nameLabel')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder={t('proprietaireBoatForm.namePlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="type" className={labelClass}>
                {t('proprietaireBoatForm.typeLabel')}
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className={`select-glass ${inputClass}`}
              >
                {BOAT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`proprietaireBoatForm.types.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="registration" className={labelClass}>
                {t('proprietaireBoatForm.registrationLabel')}
              </label>
              <input
                id="registration"
                name="registration"
                type="text"
                required
                value={form.registration}
                onChange={handleRegistration}
                pattern="[A-Z]{2}-[A-Z]{3}-[0-9]{3}"
                title={t('proprietaireBoatForm.registrationTitle')}
                placeholder={t('proprietaireBoatForm.registrationPlaceholder')}
                aria-describedby="registration-hint"
                className={inputClass}
              />
              <small id="registration-hint" className="mt-1 block text-xs text-white/60">
                {t('proprietaireBoatForm.registrationHint')}
              </small>
            </div>

            <div>
              <label htmlFor="size" className={labelClass}>
                {t('proprietaireBoatForm.lengthLabel')}
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
                {t('proprietaireBoatForm.capacityLabel')}
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
                {t('proprietaireBoatForm.priceLabel')}
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
                {t('proprietaireBoatForm.buildYearLabel')}
              </label>
              <select
                id="build_year"
                name="build_year"
                value={form.build_year}
                onChange={handleChange}
                className={`select-glass ${inputClass}`}
              >
                <option value="">{t('proprietaireBoatForm.notSpecified')}</option>
                {BUILD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="engine" className={labelClass}>
                {t('proprietaireBoatForm.engineLabel')}
              </label>
              <input
                id="engine"
                name="engine"
                type="text"
                value={form.engine}
                onChange={handleChange}
                placeholder={t('proprietaireBoatForm.enginePlaceholder')}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className={labelClass}>
                {t('proprietaireBoatForm.descriptionLabel')}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                placeholder={t('proprietaireBoatForm.descriptionPlaceholder')}
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
                {t('proprietaireBoatForm.skipperOffered')}{' '}
                <span className="text-xs text-white/60">
                  {t('proprietaireBoatForm.skipperHint')}
                </span>
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
              {t('proprietaireBoatForm.licenseRequired')}
            </label>
          </div>
        </section>

        {/* Port d'attache */}
        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-white/90">
            {t('proprietaireBoatForm.homePortTitle')}
          </h2>

          <div ref={portBoxRef} className="relative">
            <label htmlFor="port" className={labelClass}>
              {t('proprietaireBoatForm.portLabel')}
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
              placeholder={t('proprietaireBoatForm.portPlaceholder')}
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
              {t('proprietaireBoatForm.portSelected', {
                name: resolvedPort.name,
                city: resolvedPort.city,
              })}
            </p>
          )}

          {!resolvedPort && portQuery.trim().length > 0 && (
            <p className="mt-2 text-xs text-amber-300">
              {t('proprietaireBoatForm.portSelectHint')}
            </p>
          )}
        </section>

        {/* Photos */}
        <section className={cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-white/90">
            {t('proprietaireBoatForm.photosTitle')}
          </h2>
          <p className="mb-4 text-xs text-white/60">
            {t('proprietaireBoatForm.photosHint', { max: MAX_PHOTOS })}
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
                    {t('proprietaireBoatForm.mainPhoto')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={t('proprietaireBoatForm.removePhoto', { n: i + 1 })}
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
                {t('proprietaireBoatForm.addPhoto')}
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
          <h2 className="mb-1 text-sm font-semibold text-white/90">
            {t('proprietaireBoatForm.documentsTitle')}
          </h2>
          <p className="mb-4 text-xs text-white/60">{t('proprietaireBoatForm.documentsHint')}</p>

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
                  ? t('proprietaireBoatForm.docValidated')
                  : existingActe.status === 'refused'
                    ? t('proprietaireBoatForm.docRefused')
                    : t('proprietaireBoatForm.docPending')}
              </span>
            </div>
          )}

          {acteFile ? (
            /* Nouveau fichier choisi : il sera vérifié par l'équipe. */
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 truncate rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">
                {acteFile.name}{' '}
                <span className="text-xs text-amber-300">
                  {t('proprietaireBoatForm.willBeReviewedInline')}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setActeFile(null)}
                className={`rounded-full border border-white/40 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                {t('proprietaireBoatForm.removeDoc')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {/* Option 1 : réutiliser un acte de francisation déjà déposé. */}
              {myActes.length > 0 && (
                <div className="min-w-0">
                  <label htmlFor="acte-existant" className={labelClass}>
                    {t('proprietaireBoatForm.useExistingDoc')}
                  </label>
                  <select
                    id="acte-existant"
                    value={acteDocId}
                    onChange={(e) => setActeDocId(e.target.value)}
                    className={`select-glass ${inputClass}`}
                  >
                    <option value="">{t('proprietaireBoatForm.chooseOption')}</option>
                    {myActes.map((d) => (
                      <option key={d.id_document} value={d.id_document}>
                        {d.file_name} (
                        {t(`proprietaireBoatForm.docStatusInline.${d.status}`, {
                          defaultValue: d.status,
                        })}
                        )
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
                    ? t('proprietaireBoatForm.uploadNewInline')
                    : existingActe
                      ? t('proprietaireBoatForm.replaceDoc')
                      : t('proprietaireBoatForm.addDoc')}
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
              {t('proprietaireBoatForm.docTip')}{' '}
              <Link
                to="/proprietaire/documents"
                className={`text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
              >
                {t('proprietaireBoatForm.myDocuments')}
              </Link>{' '}
              {t('proprietaireBoatForm.docTipEnd')}
            </p>
          )}
        </section>

        {/* Disponibilités */}
        <section className={cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-white/90">
            {t('proprietaireBoatForm.availabilityTitle')}
          </h2>
          <p className="mb-4 text-xs text-white/60">{t('proprietaireBoatForm.availabilityHint')}</p>

          <ul className="space-y-3">
            {availabilities.map((a, i) => (
              <li
                key={i}
                className="grid items-end gap-3 rounded-lg border border-white/20 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
              >
                <div>
                  <label htmlFor={`avail-start-${i}`} className={labelClass}>
                    {t('proprietaireBoatForm.from')}
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
                    {t('proprietaireBoatForm.to')}
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
                    {t('proprietaireBoatForm.specificPrice')}
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
                    {t('proprietaireBoatForm.note')}
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
                  aria-label={t('proprietaireBoatForm.removePeriod', { n: i + 1 })}
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
            {t('proprietaireBoatForm.addPeriod')}
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
            {t('proprietaireBoatForm.cancel')}
          </button>
          {/* « Enregistrer en brouillon » : uniquement en création ou sur un brouillon. */}
          {(!editId || editStatus === 'draft') && (
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, true)}
              className={`rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
            >
              {t('proprietaireBoatForm.saveDraft')}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {submitting
              ? t('proprietaireBoatForm.sending')
              : !editId || editStatus === 'draft'
                ? t('proprietaireBoatForm.submitForReview')
                : editStatus === 'published'
                  ? t('proprietaireBoatForm.saveChanges')
                  : t('proprietaireBoatForm.resubmit')}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProprietaireBoatForm;
