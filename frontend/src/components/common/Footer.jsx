import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useCookieConsent } from '../../hooks/useCookieConsent.jsx';
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
    { label: t('footer.infoLinks.legal'), href: '#' },
    { label: t('footer.infoLinks.privacy'), href: '#' },
    { label: t('footer.infoLinks.terms'), href: '#' },
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
  const navigate = useNavigate();
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
      navigate(messagesPath, { state: { openUser: res.data.admin } });
    } catch {
      navigate(messagesPath);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <footer
      id="contact"
      className="text-gray-300 px-16 flex flex-col justify-between"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        borderTop: '1px solid rgba(90, 180, 236, 0.2)',
      }}
    >
      <div className="grid grid-cols-[1fr_1fr_auto] gap-x-10 gap-y-4 w-full pt-8">
        {/* Ligne A */}
        <div>
          <img src={logoLong} alt="SailingLoc logo" className="w-36" />
        </div>
        <div />
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {APP_LINKS.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full text-xs whitespace-nowrap px-2.5 py-1"
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
          <div className="flex gap-3 text-xl">
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
        <h3 className="text-white font-semibold text-lg">{t('footer.contact')}</h3>
        <h3 className="text-white font-semibold text-lg">{t('footer.help')}</h3>
        <h3 className="text-white font-semibold text-lg">{t('footer.info')}</h3>

        {/* Ligne C — contenu */}
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <FaPhone className="text-blue-400" />
            <span>+33 (0)2 00 66 77 89</span>
          </li>
          <li className="flex items-center gap-2">
            <FaEnvelope className="text-blue-400" />
            <a href="mailto:contact@sailingloc.fr" className="hover:text-white transition-colors">
              contact@sailingloc.fr
            </a>
          </li>
          <li className="flex items-center gap-2">
            <FaComments className="text-blue-400" />
            {user ? (
              <button
                type="button"
                onClick={openSupportChat}
                disabled={chatBusy}
                className="hover:text-white transition-colors disabled:opacity-60"
              >
                {chatBusy ? 'Ouverture…' : t('footer.chat')}
              </button>
            ) : (
              <Link to="/login" className="hover:text-white transition-colors">
                {t('footer.chat')}
              </Link>
            )}
          </li>
        </ul>

        <ul className="space-y-2 text-sm">
          {helpLinks.map((text) => (
            <li key={text}>
              <a href="#" className="hover:text-white transition-colors">
                {text}
              </a>
            </li>
          ))}
          <li className="pt-1 border-t border-white/20">
            <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
              <FaCircleInfo className="text-blue-400 flex-shrink-0" />
              <span>{t('footer.moreInfo')}</span>
            </a>
          </li>
        </ul>

        <ul className="space-y-2 text-sm">
          <li>{t('footer.founded')}</li>
          <li className="flex items-center gap-1.5">
            <FaLocationDot className="text-blue-400 flex-shrink-0" />
            <span>{t('footer.address')}</span>
          </li>
          {infoLinks.map(({ label, href }) => (
            <li key={label}>
              <a href={href} className="hover:text-white transition-colors">
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
      <div className="w-full mt-8 pb-6 pt-4 border-t border-white/20">
        <p className="text-white/60 text-xs flex items-center gap-1 whitespace-nowrap">
          {t('footer.copyright')} <FaTriangleExclamation className="text-yellow-400/70 shrink-0" />
          <span className="text-white/40">{t('footer.disclaimer')}</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
