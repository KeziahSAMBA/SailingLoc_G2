import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useCookieConsent } from '../../hooks/useCookieConsent.jsx';
import { usePageExitNavigate } from '../../hooks/usePageTransition.js';
import { contactSupport } from '../../services/messageService.js';
import logoLong from '../../assets/image/SL_logo/logo SL long.webp';
import bgImage from '../../assets/image/image_bateau/bateau_searchbar.webp';
import {
  FaInstagram,
  FaXTwitter,
  FaFacebook,
  FaPhone,
  FaEnvelope,
  FaComments,
  FaTriangleExclamation,
  FaCircleInfo,
  FaLocationDot,
} from 'react-icons/fa6';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';

const APP_LINKS = [
  { icon: <SiAppstore />, label: 'App Store', href: 'https://apps.apple.com' },
  { icon: <SiGoogleplay />, label: 'Google Play', href: 'https://play.google.com' },
];

const SOCIAL_LINKS = [
  {
    icon: <FaInstagram />,
    label: 'Instagram',
    href: 'https://instagram.com',
    hoverClass: 'hover:text-pink-400',
  },
  {
    icon: <FaXTwitter />,
    label: 'X / Twitter',
    href: 'https://x.com',
    hoverClass: 'hover:text-white',
  },
  {
    icon: <FaFacebook />,
    label: 'Facebook',
    href: 'https://facebook.com',
    hoverClass: 'hover:text-blue-500',
  },
];

function getHelpLinks(t) {
  return [
    t('footer.helpLinks.findBoat'),
    t('footer.helpLinks.documents'),
    t('footer.helpLinks.cancel'),
    t('footer.helpLinks.payment'),
    t('footer.helpLinks.listBoat'),
    t('footer.helpLinks.insurance'),
    t('footer.helpLinks.review'),
    t('footer.helpLinks.incident'),
    t('footer.helpLinks.other'),
  ];
}

function getInfoLinks(t) {
  return [
    { label: t('footer.infoLinks.legal'), href: '/mentions-legales' },
    { label: t('footer.infoLinks.privacy'), href: '/politique-de-confidentialite' },
    { label: t('footer.infoLinks.terms'), href: '/cgu' },
    { label: t('footer.infoLinks.sales'), href: '/cgv' },
  ];
}

const appBtnStyle = {
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.5)',
  backgroundColor: 'transparent',
  transition: 'background-color 0.2s, border-color 0.2s',
};

const Footer = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openPreferences } = useCookieConsent();
  const pageExitNavigate = usePageExitNavigate();
  const [chatBusy, setChatBusy] = useState(false);
  const helpLinks = getHelpLinks(t);
  const infoLinks = getInfoLinks(t);

  const messagesPath =
    user?.role === 'proprietaire' ? '/proprietaire/messages' : '/locataire/messages';

  // Le chat = la messagerie interne, comme sur la page Contact. Pour un
  // utilisateur connecté, le serveur ouvre la conversation support puis on
  // arrive directement sur le fil ; sinon on redirige vers la connexion.
  async function openSupportChat() {
    if (chatBusy) return;
    setChatBusy(true);
    try {
      const res = await contactSupport();
      pageExitNavigate(messagesPath, { state: { openUser: res.data.admin } });
    } catch {
      pageExitNavigate(messagesPath);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <footer
      id="contact"
      className="flex flex-col justify-between overflow-x-hidden px-4 text-gray-300 sm:px-8 lg:px-12 xl:px-16"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderTop: '1px solid rgba(90, 180, 236, 0.2)',
      }}
    >
      <div className="grid w-full min-w-0 grid-cols-1 gap-x-10 gap-y-4 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        {/* Ligne A */}
        <div className="order-1 lg:order-none">
          <img src={logoLong} alt="SailingLoc logo" className="w-32 sm:w-36" />
        </div>
        <div className="hidden lg:block" />
        <div className="order-2 flex min-w-0 flex-row items-center gap-2 border-b border-white/20 pb-6 sm:gap-4 lg:order-none lg:border-0 lg:pb-0">
          <div className="flex w-fit min-w-0 flex-wrap gap-1 sm:gap-2">
            {APP_LINKS.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit min-w-0 flex-none items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs sm:px-2.5"
                style={appBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.borderColor = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
              >
                <span className="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] text-base">
                  {icon}
                </span>
                {label}
              </a>
            ))}
          </div>
          <div className="flex shrink-0 gap-2 text-lg sm:gap-4 sm:text-xl">
            {SOCIAL_LINKS.map(({ icon, label, href, hoverClass }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`${hoverClass} transition-colors`}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Ligne B — titres */}
        <h3 className="order-3 mt-3 text-lg font-semibold text-white lg:order-none lg:mt-0">
          {t('footer.contact')}
        </h3>
        <h3 className="order-5 mt-4 border-t border-white/15 pt-6 text-lg font-semibold text-white lg:order-none lg:mt-0 lg:border-0 lg:pt-0">
          {t('footer.help')}
        </h3>
        <h3 className="order-7 mt-4 border-t border-white/15 pt-6 text-lg font-semibold text-white lg:order-none lg:mt-0 lg:border-0 lg:pt-0">
          {t('footer.info')}
        </h3>

        {/* Ligne C — contenu */}
        <ul className="order-4 min-w-0 space-y-3 text-sm lg:order-none">
          <li className="flex items-start gap-2">
            <FaPhone className="mt-0.5 shrink-0 text-blue-400" />
            <span className="break-words">+33 (0)2 00 66 77 89</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <FaEnvelope className="mt-0.5 shrink-0 text-blue-400" />
            <a
              href="mailto:contact@sailingloc.fr"
              className="min-w-0 break-all transition-colors hover:text-white"
            >
              contact@sailingloc.fr
            </a>
          </li>
          <li className="flex items-start gap-2">
            <FaComments className="mt-0.5 shrink-0 text-blue-400" />
            {user ? (
              <button
                type="button"
                onClick={openSupportChat}
                disabled={chatBusy}
                className="text-left transition-colors hover:text-white disabled:opacity-60"
              >
                {chatBusy ? 'Ouverture…' : t('footer.chat')}
              </button>
            ) : (
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  pageExitNavigate('/login');
                }}
                className="hover:text-white transition-colors"
              >
                {t('footer.chat')}
              </a>
            )}
          </li>
        </ul>

        <ul className="order-6 min-w-0 space-y-2 text-sm lg:order-none">
          {helpLinks.map((text) => (
            <li key={text}>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  pageExitNavigate('/contact');
                }}
                className="break-words transition-colors hover:text-white"
              >
                {text}
              </a>
            </li>
          ))}
          <li className="border-t border-white/20 pt-3">
            <a
              href="/a-propos"
              onClick={(e) => {
                e.preventDefault();
                pageExitNavigate('/a-propos');
              }}
              className="flex items-start gap-2 transition-colors hover:text-white"
            >
              <FaCircleInfo className="mt-0.5 shrink-0 text-blue-400" />
              <span className="break-words">{t('footer.moreInfo')}</span>
            </a>
          </li>
        </ul>

        <ul className="order-8 min-w-0 space-y-2 pb-2 text-sm lg:order-none lg:pb-0">
          <li>{t('footer.founded')}</li>
          <li className="flex items-start gap-2">
            <FaLocationDot className="mt-0.5 shrink-0 text-blue-400" />
            <span className="break-words">{t('footer.address')}</span>
          </li>
          {infoLinks.map(({ label, href }) => (
            <li key={label}>
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  pageExitNavigate(href);
                }}
                className="break-words transition-colors hover:text-white"
              >
                {label}
              </a>
            </li>
          ))}
          {/* Point d'accès permanent au paramétrage des cookies (CNIL : le
              retrait du consentement doit rester aussi simple que le dépôt). */}
          <li>
            <button
              type="button"
              onClick={openPreferences}
              className="hover:text-white transition-colors"
            >
              {t('footer.manageCookies')}
            </button>
          </li>
        </ul>
      </div>

      {/* Copyright */}
      <div className="mt-6 w-full border-t border-white/20 pb-6 pt-4 lg:mt-8">
        <p className="flex flex-wrap items-start gap-x-1 gap-y-1 text-xs leading-relaxed text-white/60">
          <span>{t('footer.copyright')}</span>
          <FaTriangleExclamation className="mt-0.5 shrink-0 text-yellow-400/70" />
          <span className="min-w-0 break-words text-white/40">{t('footer.disclaimer')}</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
