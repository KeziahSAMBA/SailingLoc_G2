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

const HELP_LINKS = [
  'Comment trouver et réserver un bateau ?',
  'Quels documents sont requis pour louer ?',
  'Comment annuler ou modifier une réservation ?',
  'Quels modes de paiement sont acceptés ?',
  'Comment mettre mon bateau en location ?',
  'Les bateaux sont-ils assurés pendant la location ?',
  'Comment laisser un avis après ma location ?',
  "Que faire en cas d'incident en mer ?",
  'Une autre question ? Contactez-nous en direct',
];

const INFO_LINKS = [
  { label: 'Mentions légales', href: '#' },
  { label: 'Politique de confidentialité', href: '#' },
  { label: "Conditions générales d'utilisation", href: '#' },
];

const appBtnStyle = {
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.5)',
  backgroundColor: 'transparent',
  transition: 'background-color 0.2s, border-color 0.2s',
};

const Footer = () => {
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
        <h3 className="text-white font-semibold text-lg">Contact</h3>
        <h3 className="text-white font-semibold text-lg">Aide &amp; Assistance</h3>
        <h3 className="text-white font-semibold text-lg">Informations</h3>

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
            <a href="#" className="hover:text-white transition-colors">
              Chat en ligne
            </a>
          </li>
        </ul>

        <ul className="space-y-2 text-sm">
          {HELP_LINKS.map((text) => (
            <li key={text}>
              <a href="#" className="hover:text-white transition-colors">
                {text}
              </a>
            </li>
          ))}
          <li className="pt-1 border-t border-white/20">
            <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
              <FaCircleInfo className="text-blue-400 flex-shrink-0" />
              <span>Information complémentaire</span>
            </a>
          </li>
        </ul>

        <ul className="space-y-2 text-sm">
          <li>Fondée en 2023</li>
          <li className="flex items-center gap-1.5">
            <FaLocationDot className="text-blue-400 flex-shrink-0" />
            <span>12 Quai du Port, 13002 Marseille, France</span>
          </li>
          {INFO_LINKS.map(({ label, href }) => (
            <li key={label}>
              <a href={href} className="hover:text-white transition-colors">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Copyright */}
      <div className="w-full mt-8 pb-6 pt-4 border-t border-white/20">
        <p className="text-white/60 text-xs flex items-center gap-1 whitespace-nowrap">
          © 2023–2026 SailingLoc. Tous droits réservés.{' '}
          <FaTriangleExclamation className="text-yellow-400/70 shrink-0" />
          <span className="text-white/40">
            Projet fictif à des fins pédagogiques — aucun achat/réservation réelle. Toute
            ressemblance avec un site existant est fortuite.
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
