import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPhone, FaEnvelope, FaComments } from 'react-icons/fa6';
import { useAuth } from '../hooks/useAuth.jsx';
import { sendContactRequest } from '../services/contactService.js';
import { contactSupport } from '../services/messageService.js';
import contactBg from '../assets/image/paysage/contact_bg.jpg';

// Rubriques d'aide : mêmes questions que le footer, avec leurs réponses.
function getFAQ(t) {
  return [
    { q: t('contactPage.faq.items.findBoat.q'), a: t('contactPage.faq.items.findBoat.a') },
    { q: t('contactPage.faq.items.documents.q'), a: t('contactPage.faq.items.documents.a') },
    { q: t('contactPage.faq.items.cancel.q'), a: t('contactPage.faq.items.cancel.a') },
    { q: t('contactPage.faq.items.payment.q'), a: t('contactPage.faq.items.payment.a') },
    { q: t('contactPage.faq.items.listBoat.q'), a: t('contactPage.faq.items.listBoat.a') },
    { q: t('contactPage.faq.items.insurance.q'), a: t('contactPage.faq.items.insurance.a') },
    { q: t('contactPage.faq.items.review.q'), a: t('contactPage.faq.items.review.a') },
    { q: t('contactPage.faq.items.incident.q'), a: t('contactPage.faq.items.incident.a') },
  ];
}

// Focus clavier visible sur fond sombre (liens et accordéons du formulaire/FAQ).
const FOCUS_LIGHT =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Cartes glassmorphism, comme les autres blocs de la page (formulaire, FAQ) —
// mise en page (gap, tailles de texte) reprise du modèle Section 4 (proposition
// de valeur) de la page d'accueil.
const detailCardClass =
  'flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-[5px] transition-all duration-300 hover:-translate-y-1 sm:p-6';

const inputLight =
  'w-full rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/45 outline-none backdrop-blur-md transition focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/20';
const labelLight = 'mb-1.5 block text-sm font-medium text-white/80';

const PHOTO_BG_STYLE = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  backgroundImage: `linear-gradient(rgba(3,24,30,0.62), rgba(3,35,39,0.72)), url(${contactBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

function ContactPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatBusy, setChatBusy] = useState(false);

  // Rubriques FAQ ouvertes (plusieurs à la fois possible), pour l'effet de
  // glissade animé via la technique grid-template-rows 0fr/1fr.
  const [openFaqItems, setOpenFaqItems] = useState(() => new Set());
  function toggleFaqItem(index) {
    setOpenFaqItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const messagesPath =
    user?.role === 'proprietaire' ? '/proprietaire/messages' : '/locataire/messages';

  // Le chat = la messagerie interne. Pour un utilisateur connecté, le serveur
  // ouvre la conversation support (admin choisi au hasard, message d'accueil
  // automatique au premier contact) puis on arrive directement sur le fil.
  async function openSupportChat() {
    if (chatBusy) return;
    setChatBusy(true);
    try {
      const res = await contactSupport();
      navigate(messagesPath, { state: { openUser: res.data.admin } });
    } catch {
      // En cas de pépin, on retombe simplement sur la messagerie.
      navigate(messagesPath);
    } finally {
      setChatBusy(false);
    }
  }

  // Formulaire de contact — pré-rempli pour un utilisateur connecté.
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formBusy, setFormBusy] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || [user.first_name, user.last_name].filter(Boolean).join(' '),
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormBusy(true);
    try {
      await sendContactRequest(form);
      setFormSent(true);
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
    } catch (err) {
      setFormError(err.response?.data?.message || t('contactPage.form.error'));
    } finally {
      setFormBusy(false);
    }
  }

  const FAQ = useMemo(() => getFAQ(t), [t]);

  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = t('contactPage.pageTitle');
  }, [t]);

  return (
    <main className="w-full overflow-x-clip text-white" style={PHOTO_BG_STYLE}>
      {/* Hero de la page Contact + coordonnées */}
      <section
        id="contact-hero"
        className="relative flex min-h-[100svh] w-full scroll-mt-[80px] flex-col items-center justify-center px-4 pb-10 pt-[96px]"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
            {t('contactPage.hero.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            {t('contactPage.hero.tagline')}
          </p>
        </div>

        <div
          id="contact-details"
          aria-labelledby="coordonnees-title"
          className="mt-10 w-full max-w-5xl scroll-mt-[80px]"
        >
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              {t('contactPage.details.kicker')}
            </p>
            <h2
              id="coordonnees-title"
              className="text-xl font-semibold text-white sm:text-2xl md:text-3xl"
            >
              {t('contactPage.details.title')}
            </h2>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8">
            <li className={detailCardClass}>
              <FaPhone aria-hidden="true" className="text-3xl text-sky-500" />
              <h3 className="text-sm font-semibold text-white">
                {t('contactPage.details.phone.title')}
              </h3>
              <p className="text-xs leading-relaxed text-white/65">
                {t('contactPage.details.phone.hours')}
              </p>
              <a
                href="tel:+33200667789"
                className={`font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
              >
                +33 (0)2 00 66 77 89
              </a>
            </li>
            <li className={detailCardClass}>
              <FaComments aria-hidden="true" className="text-3xl text-sky-500" />
              <h3 className="text-sm font-semibold text-white">
                {t('contactPage.details.chat.title')}
              </h3>
              <p className="text-xs leading-relaxed text-white/65">
                {t('contactPage.details.chat.text')}
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={openSupportChat}
                  disabled={chatBusy}
                  className={`font-medium text-sky-300 hover:text-sky-200 hover:underline disabled:opacity-60 ${FOCUS_LIGHT}`}
                >
                  {chatBusy
                    ? t('contactPage.details.chat.opening')
                    : t('contactPage.details.chat.open')}
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
                >
                  {t('contactPage.details.chat.login')}
                </Link>
              )}
            </li>
            <li className={detailCardClass}>
              <FaEnvelope aria-hidden="true" className="text-3xl text-sky-500" />
              <h3 className="text-sm font-semibold text-white">
                {t('contactPage.details.email.title')}
              </h3>
              <p className="text-xs leading-relaxed text-white/65">
                {t('contactPage.details.email.text')}
              </p>
              <a
                href="mailto:contact@sailingloc.fr"
                className={`font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
              >
                contact@sailingloc.fr
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Formulaire de contact et rubriques d'aide */}
      <div className="flex min-h-[100svh] w-full flex-col justify-center px-4 py-10">
        <div className="mx-auto grid w-full max-w-7xl items-start gap-10 md:grid-cols-2 md:items-start md:gap-2 lg:gap-4">
          <section
            id="contact-form"
            aria-labelledby="form-title"
            className="mx-auto w-full max-w-2xl scroll-mt-[130px]"
          >
            <div className="mb-6 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
                {t('contactPage.form.kicker')}
              </p>
              <h2
                id="form-title"
                className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl"
              >
                {t('contactPage.form.title')}
              </h2>
            </div>

            {formSent ? (
              <div
                role="status"
                className="mx-auto w-3/4 rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-6 py-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl md:flex md:flex-1 md:flex-col md:items-center md:justify-center"
              >
                <p className="text-lg font-semibold text-emerald-200">
                  {t('contactPage.form.sent.title')}
                </p>
                <p className="mt-2 text-sm text-emerald-100/80">
                  {t('contactPage.form.sent.text')}
                </p>
                <button
                  type="button"
                  onClick={() => setFormSent(false)}
                  className={`mt-4 font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
                >
                  {t('contactPage.form.sent.again')}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleFormSubmit}
                className="mx-auto w-3/4 rounded-2xl border border-white/20 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-[5px] md:flex md:flex-1 md:flex-col"
              >
                {formError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-red-300/50 bg-red-400/15 px-4 py-2 text-sm text-red-100"
                  >
                    {formError}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 md:flex-1 md:grid-rows-[auto_auto_minmax(0,1fr)]">
                  <div>
                    <label htmlFor="contact-name" className={labelLight}>
                      {t('contactPage.form.name')}
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      maxLength={150}
                      value={form.name}
                      onChange={handleFormChange}
                      autoComplete="name"
                      className={inputLight}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className={labelLight}>
                      {t('contactPage.form.email')}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      maxLength={255}
                      value={form.email}
                      onChange={handleFormChange}
                      autoComplete="email"
                      className={inputLight}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="contact-subject" className={labelLight}>
                      {t('contactPage.form.subject')}
                    </label>
                    <input
                      id="contact-subject"
                      name="subject"
                      type="text"
                      required
                      maxLength={200}
                      value={form.subject}
                      onChange={handleFormChange}
                      placeholder={t('contactPage.form.subjectPlaceholder')}
                      className={inputLight}
                    />
                  </div>
                  <div className="sm:col-span-2 md:flex md:min-h-0 md:flex-col">
                    <label htmlFor="contact-message" className={labelLight}>
                      {t('contactPage.form.message')}
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={3}
                      required
                      maxLength={5000}
                      value={form.message}
                      onChange={handleFormChange}
                      placeholder={t('contactPage.form.messagePlaceholder')}
                      className={`${inputLight} md:min-h-0 md:flex-1`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formBusy}
                  className={`mx-auto mt-4 block w-fit rounded-full border border-white/40 bg-[rgba(14,165,233,0.55)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(14,165,233,0.35)] backdrop-blur-md transition hover:border-white/20 hover:bg-[rgba(10,49,114,0.95)] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_LIGHT}`}
                >
                  {formBusy ? t('contactPage.form.submitting') : t('contactPage.form.submit')}
                </button>
              </form>
            )}
          </section>

          <section
            id="contact-faq"
            aria-labelledby="faq-title"
            className="mx-auto w-full max-w-3xl scroll-mt-[130px]"
          >
            <div className="mb-6 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
                {t('contactPage.faq.kicker')}
              </p>
              <h2
                id="faq-title"
                className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl"
              >
                {t('contactPage.faq.title')}
              </h2>
            </div>

            <div className="mx-auto w-3/4 space-y-2">
              {FAQ.map((item, index) => {
                const open = openFaqItems.has(index);
                const answerId = `faq-answer-${index}`;
                return (
                  <div
                    key={item.q}
                    className={`rounded-2xl border border-white/20 bg-white/5 shadow-sm backdrop-blur-[5px] transition-colors duration-300 ${open ? 'bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.18)]' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaqItem(index)}
                      aria-expanded={open}
                      aria-controls={answerId}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-white transition hover:text-sky-300 ${FOCUS_LIGHT}`}
                    >
                      {item.q}
                      <span
                        aria-hidden="true"
                        className={`shrink-0 text-sky-300 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
                      >
                        +
                      </span>
                    </button>
                    <div
                      id={answerId}
                      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-4 pb-3 text-sm leading-relaxed text-white/65">{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-center text-sm text-white/70">
              {t('contactPage.faq.otherQuestion')}{' '}
              {user ? (
                <button
                  type="button"
                  onClick={openSupportChat}
                  disabled={chatBusy}
                  className={`font-medium text-sky-300 hover:text-sky-200 hover:underline disabled:opacity-60 ${FOCUS_LIGHT}`}
                >
                  {t('contactPage.faq.contactDirect')}
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
                >
                  {t('contactPage.faq.contactDirect')}
                </Link>
              )}{' '}
              — {t('contactPage.faq.otherSuffix')}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default ContactPage;
