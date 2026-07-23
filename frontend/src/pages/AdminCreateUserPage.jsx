import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminCreateUser } from '../services/authService.js';

const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;

const ROLES = [
  ['locataire', 'Locataire'],
  ['proprietaire', 'Propriétaire'],
  ['admin', 'Administrateur'],
];

const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none transition focus:border-[#5AB4EC] focus:ring-2 focus:ring-[#5AB4EC]/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-white/80';
const errorClass = 'mt-1 block text-xs text-red-400';
const requiredMark = (
  <span aria-hidden="true" className="ml-0.5 text-[#5AB4EC]">
    *
  </span>
);

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'locataire',
};

function AdminCreateUserPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const newErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'Le prénom est requis.';
    if (!form.last_name.trim()) newErrors.last_name = 'Le nom est requis.';
    if (!form.email.trim()) newErrors.email = "L'email est requis.";
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      newErrors.phone = 'Le numéro de téléphone est invalide.';
    }
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const { user } = await adminCreateUser({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone.trim() || undefined,
        role: form.role,
      });
      setSuccess(user);
      setForm(EMPTY_FORM);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Ajouter un compte</h1>
        <p className="mt-2 text-white/80">
          Créez un compte utilisateur. L'utilisateur recevra un email pour définir lui-même son mot
          de passe.
        </p>
        <p className="mt-1 text-xs text-white/60">
          Les champs marqués d&apos;un <span className="text-[#5AB4EC]">*</span> sont obligatoires.
        </p>
      </header>

      <article className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-xl">
        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            Compte créé pour <span className="font-semibold">{success.email}</span> ({success.role}
            ). Un email vient de lui être envoyé pour définir son mot de passe.
          </div>
        )}

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className={labelClass}>
                Prénom{requiredMark}
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={form.first_name}
                onChange={handleChange}
                autoComplete="given-name"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.first_name)}
                aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                className={inputClass}
              />
              {errors.first_name && (
                <span id="first_name-error" className={errorClass}>
                  {errors.first_name}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="last_name" className={labelClass}>
                Nom{requiredMark}
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={form.last_name}
                onChange={handleChange}
                autoComplete="family-name"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.last_name)}
                aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                className={inputClass}
              />
              {errors.last_name && (
                <span id="last_name-error" className={errorClass}>
                  {errors.last_name}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email{requiredMark}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={inputClass}
            />
            {errors.email && (
              <span id="email-error" className={errorClass}>
                {errors.email}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Téléphone <span className="font-normal text-white/70">(facultatif)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              placeholder="+33 6 12 34 56 78"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              className={inputClass}
            />
            {errors.phone && (
              <span id="phone-error" className={errorClass}>
                {errors.phone}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="role" className={labelClass}>
              Rôle{requiredMark}
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              className={`select-glass ${inputClass}`}
            >
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Création en cours…' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

export default AdminCreateUserPage;
