import { useState } from 'react';
import { register } from '../services/authService.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;

function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'locataire',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
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
    if (!PASSWORD_REGEX.test(form.password)) {
      newErrors.password =
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule et un caractère spécial.';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
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
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h2>Inscription réussie !</h2>
        <p>Un email de confirmation a été envoyé à {form.email}. Vérifiez votre boîte mail pour activer votre compte.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Créer un compte</h2>

      {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="first_name">Prénom</label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            value={form.first_name}
            onChange={handleChange}
            autoComplete="given-name"
          />
          {errors.first_name && <span style={{ color: 'red' }}>{errors.first_name}</span>}
        </div>

        <div>
          <label htmlFor="last_name">Nom</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            value={form.last_name}
            onChange={handleChange}
            autoComplete="family-name"
          />
          {errors.last_name && <span style={{ color: 'red' }}>{errors.last_name}</span>}
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
          {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
        </div>

        <fieldset>
          <legend>Rôle</legend>
          <label>
            <input
              type="radio"
              name="role"
              value="locataire"
              checked={form.role === 'locataire'}
              onChange={handleChange}
            />
            Locataire
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="proprietaire"
              checked={form.role === 'proprietaire'}
              onChange={handleChange}
            />
            Propriétaire
          </label>
        </fieldset>

        <div>
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <small>12 caractères minimum, 1 majuscule, 1 caractère spécial.</small>
          {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
        </div>

        <div>
          <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword}</span>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Inscription en cours...' : "S'inscrire"}
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;