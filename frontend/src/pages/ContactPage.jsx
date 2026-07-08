import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaComments } from 'react-icons/fa6';
import { useAuth } from '../hooks/useAuth.jsx';
import { contactSupport } from '../services/messageService.js';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.webp';

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
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2';

// Cartes blanches ombrées, comme les sections de la page d'accueil.
const cardClass =
  'rounded-2xl border border-black/15 bg-white p-6 shadow-[0_8px_48px_rgba(0,0,0,0.10)]';

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

  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = 'Contact & aide — SailingLoc';
  }, []);

  return (
    <main className="w-full bg-white">
      {/* Hero photo + voile sombre, comme l'accueil */}
      <section className="relative flex min-h-[45vh] w-full flex-col items-center justify-center overflow-hidden px-4 pt-[96px]">
        <img
          src={bateauBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center">
          <h1 className="text-4xl font-semibold text-white md:text-5xl">Contact &amp; aide</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-300">
            Une question, un souci ? Notre équipe vous répond du lundi au samedi, de 9 h à 18 h.
          </p>
        </div>
      </section>

      {/* Coordonnées */}
      <section aria-labelledby="coordonnees-title" className="w-full bg-white px-4 py-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-700 underline underline-offset-4">
              Nous joindre
            </p>
            <h2 id="coordonnees-title" className="text-3xl font-semibold text-gray-900 md:text-4xl">
              Trois façons de nous contacter
            </h2>
          </div>

          <ul className="grid gap-6 sm:grid-cols-3">
            <li className={`${cardClass} text-center`}>
              <FaPhone aria-hidden="true" className="mx-auto text-3xl text-sky-500" />
              <h3 className="mt-4 font-semibold text-gray-900">Téléphone</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Du lundi au samedi, 9 h – 18 h.
              </p>
              <a
                href="tel:+33200667789"
                className={`mt-4 inline-block font-medium text-sky-700 hover:underline ${FOCUS_LIGHT}`}
              >
                +33 (0)2 00 66 77 89
              </a>
            </li>
            <li className={`${cardClass} text-center`}>
              <FaComments aria-hidden="true" className="mx-auto text-3xl text-sky-500" />
              <h3 className="mt-4 font-semibold text-gray-900">Chat en ligne</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Échangez en direct avec le support depuis votre messagerie.
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={openSupportChat}
                  disabled={chatBusy}
                  className={`mt-4 inline-block font-medium text-sky-700 hover:underline disabled:opacity-60 ${FOCUS_LIGHT}`}
                >
                  {chatBusy ? 'Ouverture…' : 'Ouvrir la messagerie'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`mt-4 inline-block font-medium text-sky-700 hover:underline ${FOCUS_LIGHT}`}
                >
                  Se connecter pour discuter
                </Link>
              )}
            </li>
            <li className={`${cardClass} text-center`}>
              <FaEnvelope aria-hidden="true" className="mx-auto text-3xl text-sky-500" />
              <h3 className="mt-4 font-semibold text-gray-900">Email</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Réponse sous 24 h ouvrées.
              </p>
              <a
                href="mailto:contact@sailingloc.fr"
                className={`mt-4 inline-block font-medium text-sky-700 hover:underline ${FOCUS_LIGHT}`}
              >
                contact@sailingloc.fr
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-gray-200" />

      {/* Rubriques d'aide / FAQ */}
      <section aria-labelledby="faq-title" className="w-full bg-white px-4 py-14">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-700 underline underline-offset-4">
              FAQ
            </p>
            <h2 id="faq-title" className="text-3xl font-semibold text-gray-900 md:text-4xl">
              Rubriques d&apos;aide
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-black/15 bg-white shadow-sm open:shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
              >
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 transition hover:text-sky-700 [&::-webkit-details-marker]:hidden ${FOCUS_LIGHT}`}
                >
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-sky-700 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-gray-500">{item.a}</p>
              </details>
            ))}
          </div>

          <p className="mt-8 rounded-2xl border border-black/15 bg-white px-5 py-4 text-center text-sm text-gray-600 shadow-sm">
            Une autre question ?{' '}
            {user ? (
              <button
                type="button"
                onClick={openSupportChat}
                disabled={chatBusy}
                className={`font-medium text-sky-700 hover:underline disabled:opacity-60 ${FOCUS_LIGHT}`}
              >
                Contactez-nous en direct
              </button>
            ) : (
              <Link
                to="/login"
                className={`font-medium text-sky-700 hover:underline ${FOCUS_LIGHT}`}
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
