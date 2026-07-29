import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaComments } from 'react-icons/fa6';
import { useAuth } from '../hooks/useAuth.jsx';
import { sendContactRequest } from '../services/contactService.js';
import { contactSupport } from '../services/messageService.js';
import bateauBg from '../assets/image/paysage/cote_azur.jpg';

// Rubriques d'aide : mêmes questions que le footer, avec leurs réponses.
const FAQ = [
  {
    q: 'Comment trouver et réserver un bateau ?',
    a: 'Parcourez les annonces depuis la page Catégories ou la recherche par port, puis envoyez une demande de réservation aux dates souhaitées. Le propriétaire confirme (ou refuse) votre demande : vous êtes prévenu par email et dans votre espace.',
  },
  {
    q: 'Quels documents sont requis pour louer ?',
    a: 'Un permis bateau (côtier ou fluvial selon le bateau), une pièce d’identité en cours de validité et un CV nautique. Déposez-les dans « Mes documents » : notre équipe les vérifie sous 48 h.',
  },
  {
    q: 'Comment annuler ou modifier une réservation ?',
    a: 'Rendez-vous dans « Mes réservations » depuis votre espace. Une demande en attente peut être annulée librement ; pour une réservation confirmée, contactez le propriétaire via la messagerie — en cas de désaccord, notre équipe peut arbitrer via un litige.',
  },
  {
    q: 'Quels modes de paiement sont acceptés ?',
    a: 'La carte bancaire et le virement. Le paiement est encaissé à la confirmation de la réservation ; SailingLoc prélève une commission de 10 % sur chaque location.',
  },
  {
    q: 'Comment mettre mon bateau en location ?',
    a: 'Créez un compte propriétaire, puis « Publier un bateau » depuis votre espace : caractéristiques, photos, port d’attache, disponibilités et acte de francisation. Votre annonce est vérifiée par notre équipe avant d’être publiée.',
  },
  {
    q: 'Les bateaux sont-ils assurés pendant la location ?',
    a: 'Oui : chaque propriétaire doit fournir une attestation d’assurance valide, vérifiée par notre équipe avant la publication de l’annonce.',
  },
  {
    q: 'Comment laisser un avis après ma location ?',
    a: 'Une fois la location terminée, ouvrez « Mes réservations » : un rappel vous invite à noter le bateau et laisser un commentaire. Les avis sont modérés avant publication.',
  },
  {
    q: "Que faire en cas d'incident en mer ?",
    a: 'Votre sécurité d’abord : contactez le CROSS (196 ou VHF canal 16) en cas d’urgence. Ensuite, prévenez le propriétaire via la messagerie et signalez l’incident à notre équipe, qui ouvrira un litige si nécessaire.',
  },
];

// Focus clavier visible sur fond clair (liens et accordéons).
const FOCUS_LIGHT =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Cartes blanches ombrées, comme les sections de la page d'accueil.
const cardClass =
  'rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl';

const inputLight =
  'w-full rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/45 outline-none backdrop-blur-md transition focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/20';
const labelLight = 'mb-1.5 block text-sm font-medium text-white/80';

const PHOTO_BG_STYLE = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  backgroundImage: `linear-gradient(rgba(3,24,30,0.62), rgba(3,35,39,0.72)), url(${bateauBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

function ContactPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatBusy, setChatBusy] = useState(false);

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
      setFormError(err.response?.data?.message || 'Une erreur est survenue, réessayez.');
    } finally {
      setFormBusy(false);
    }
  }

  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = 'Contact & aide — SailingLoc';
  }, []);

  return (
    <main className="w-full overflow-x-clip text-white" style={PHOTO_BG_STYLE}>
      {/* Hero photo + voile sombre, comme l'accueil */}
      <section className="relative flex min-h-[45vh] w-full flex-col items-center justify-center overflow-hidden px-4 pt-[96px]">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative text-center">
          <h1 className="text-4xl font-semibold text-white md:text-5xl">Contact &amp; aide</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            Une question, un souci ? Notre équipe vous répond du lundi au samedi, de 9 h à 18 h.
          </p>
        </div>
      </section>

      {/* Coordonnées */}
      <section aria-labelledby="coordonnees-title" className="w-full px-4 py-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              Nous joindre
            </p>
            <h2 id="coordonnees-title" className="text-3xl font-semibold text-white md:text-4xl">
              Trois façons de nous contacter
            </h2>
          </div>

          <ul className="grid gap-6 sm:grid-cols-3">
            <li className={`${cardClass} text-center`}>
              <FaPhone aria-hidden="true" className="mx-auto text-3xl text-sky-500" />
              <h3 className="mt-4 font-semibold text-white">Téléphone</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                Du lundi au samedi, 9 h – 18 h.
              </p>
              <a
                href="tel:+33200667789"
                className={`mt-4 inline-block font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
              >
                +33 (0)2 00 66 77 89
              </a>
            </li>
            <li className={`${cardClass} text-center`}>
              <FaComments aria-hidden="true" className="mx-auto text-3xl text-sky-500" />
              <h3 className="mt-4 font-semibold text-white">Chat en ligne</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                Échangez en direct avec le support depuis votre messagerie.
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={openSupportChat}
                  disabled={chatBusy}
                  className={`mt-4 inline-block font-medium text-sky-300 hover:text-sky-200 hover:underline disabled:opacity-60 ${FOCUS_LIGHT}`}
                >
                  {chatBusy ? 'Ouverture…' : 'Ouvrir la messagerie'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`mt-4 inline-block font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
                >
                  Se connecter pour discuter
                </Link>
              )}
            </li>
            <li className={`${cardClass} text-center`}>
              <FaEnvelope aria-hidden="true" className="mx-auto text-3xl text-sky-500" />
              <h3 className="mt-4 font-semibold text-white">Email</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                Réponse sous 24 h ouvrées.
              </p>
              <a
                href="mailto:contact@sailingloc.fr"
                className={`mt-4 inline-block font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
              >
                contact@sailingloc.fr
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Formulaire de contact */}
      <section aria-labelledby="form-title" className="w-full px-4 py-14">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              Écrivez-nous
            </p>
            <h2 id="form-title" className="text-3xl font-semibold text-white md:text-4xl">
              Envoyer un message
            </h2>
          </div>

          {formSent ? (
            <div
              role="status"
              className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-6 py-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            >
              <p className="text-lg font-semibold text-emerald-200">Message bien envoyé !</p>
              <p className="mt-2 text-sm text-emerald-100/80">
                Notre équipe vous répondra à l&apos;adresse indiquée sous 24 h ouvrées.
              </p>
              <button
                type="button"
                onClick={() => setFormSent(false)}
                className={`mt-4 font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleFormSubmit}
              className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            >
              {formError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-300/50 bg-red-400/15 px-4 py-2 text-sm text-red-100"
                >
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className={labelLight}>
                    Nom *
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
                    Email *
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
                    Objet *
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    maxLength={200}
                    value={form.subject}
                    onChange={handleFormChange}
                    placeholder="Ex. : question sur une réservation"
                    className={inputLight}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="contact-message" className={labelLight}>
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    maxLength={5000}
                    value={form.message}
                    onChange={handleFormChange}
                    placeholder="Décrivez votre demande…"
                    className={inputLight}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formBusy}
                className={`mt-6 w-full rounded-full border border-white/40 bg-[rgba(14,165,233,0.55)] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(14,165,233,0.35)] backdrop-blur-md transition hover:border-white/20 hover:bg-[rgba(10,49,114,0.95)] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_LIGHT}`}
              >
                {formBusy ? 'Envoi…' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Rubriques d'aide / FAQ */}
      <section aria-labelledby="faq-title" className="w-full px-4 py-14">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              FAQ
            </p>
            <h2 id="faq-title" className="text-3xl font-semibold text-white md:text-4xl">
              Rubriques d&apos;aide
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-xl open:bg-white/15 open:shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
              >
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-white transition hover:text-sky-300 [&::-webkit-details-marker]:hidden ${FOCUS_LIGHT}`}
                >
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-sky-300 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-white/65">{item.a}</p>
              </details>
            ))}
          </div>

          <p className="mt-8 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-center text-sm text-white/70 shadow-sm backdrop-blur-xl">
            Une autre question ?{' '}
            {user ? (
              <button
                type="button"
                onClick={openSupportChat}
                disabled={chatBusy}
                className={`font-medium text-sky-300 hover:text-sky-200 hover:underline disabled:opacity-60 ${FOCUS_LIGHT}`}
              >
                Contactez-nous en direct
              </button>
            ) : (
              <Link
                to="/login"
                className={`font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
              >
                Contactez-nous en direct
              </Link>
            )}{' '}
            — nous sommes là pour vous aider.
          </p>
        </div>
      </section>
    </main>
  );
}

export default ContactPage;
