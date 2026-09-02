import { useState } from 'react';

// Trois variantes : claire (formulaires d'auth sur carte blanche), sombre
// (fonds ardoise) et verre (dashboards sur fond photo, ex. « Mon compte »).
const INPUT_CLASSES = {
  light:
    'w-full rounded-lg border border-slate-300 bg-surface px-4 py-2.5 pr-11 text-content placeholder-slate-400 outline-none transition focus:border-brand-navy focus:ring-2 focus:ring-[#0A3172]/20',
  dark: 'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 pr-11 text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
  glass:
    'w-full rounded-lg border border-glass/30 bg-surface/10 px-4 py-2.5 pr-11 text-on-dark placeholder-on-dark/40 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
};

const TOGGLE_CLASSES = {
  light: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  dark: 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
  glass: 'text-on-dark/60 hover:bg-surface/10 hover:text-on-dark',
};

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  id,
  name,
  value,
  onChange,
  autoComplete = 'new-password',
  required = false,
  ariaInvalid,
  ariaDescribedBy,
  variant = 'light',
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        aria-required={required || undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={INPUT_CLASSES[variant]}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md transition ${TOGGLE_CLASSES[variant]}`}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default PasswordField;
