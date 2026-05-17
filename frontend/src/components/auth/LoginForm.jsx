import { useState } from 'react';
import PasswordField from './PasswordField.jsx';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0A3172] focus:ring-2 focus:ring-[#0A3172]/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

function LoginForm({ onSwitchToRegister }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [notice, setNotice] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setNotice('La connexion sera bientôt disponible. Le backend est en cours de finalisation.');
  }

  return (
    <>
      <header className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-[#0A3172]">Bon retour parmi nous</h2>
        <p className="mt-2 text-sm text-slate-600">
          Connectez-vous pour accéder à votre compte SailingLoc.
        </p>
      </header>

      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800"
        >
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className={labelClass}>
              Mot de passe
            </label>
            <a href="#" className="text-xs text-[#0A3172] hover:underline">
              Mot de passe oublié&nbsp;?
            </a>
          </div>
          <PasswordField
            id="login-password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90"
        >
          Se connecter
        </button>
      </form>

      <footer className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte&nbsp;?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-semibold text-[#0A3172] hover:underline"
        >
          Inscrivez-vous
        </button>
      </footer>
    </>
  );
}

export default LoginForm;