import { useState, useEffect, useRef } from 'react';
import logoLong from '../../assets/image/SL_logo/logo SL long.webp';
import logoShort from '../../assets/image/SL_logo/logo SL.webp';
import bgImage from '../../assets/image/image_bateau/bateau_searchbar.jpg';
import {
  FaInstagram,
  FaXTwitter,
  FaFacebook,
  FaPhone,
  FaEnvelope,
  FaComments,
  FaTriangleExclamation,
  FaCircleInfo,
  FaAnglesDown,
} from 'react-icons/fa6';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';

const Footer = () => {
  const [compact, setCompact] = useState(true);
  const footerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!footerRef.current) return;
      const rect = footerRef.current.getBoundingClientRect();
      // full quand le haut du footer est dans le tiers supérieur du viewport
      setCompact(rect.top > window.innerHeight * 0.79);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const btnStyle = {
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
    fontSize: compact ? '0.65rem' : '0.75rem',
    padding: compact ? '3px 8px' : '4px 10px',
    transition: 'background-color 0.2s, border-color 0.2s, font-size 0.3s, padding 0.3s',
  };

  return (
    <>
      <footer
        ref={footerRef}
        className={`text-gray-300 px-10 ${compact ? 'pt-4 pb-20' : 'pt-8 pb-4'}`}
        style={{
          backgroundImage: `linear-gradient(${compact ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)'}, ${compact ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)'}), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          borderTop: '1px solid rgba(90, 180, 236, 0.2)',
          transition: 'background-image 0.4s ease',
        }}
      >
        <div className="grid grid-cols-3 gap-x-10 gap-y-4 max-w-6xl mx-auto">
          {/* Niveau 1 */}
          <div>
            <img
              src={compact ? logoShort : logoLong}
              alt="SailingLoc logo"
              className={compact ? 'w-10' : 'w-36'}
              style={{ transition: 'width 0.3s ease' }}
            />
          </div>
          {compact ? (
            <div className="flex justify-start items-center gap-8 pl-0 -ml-14">
              <span className="text-white font-semibold text-sm">Contact</span>
              <span className="text-white font-semibold text-sm">Aide &amp; Assistance</span>
              <span className="text-white font-semibold text-sm">Informations</span>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[
                { icon: <SiAppstore />, label: 'App Store', href: 'https://apps.apple.com' },
                { icon: <SiGoogleplay />, label: 'Google Play', href: 'https://play.google.com' },
              ].map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full whitespace-nowrap"
                  style={btnStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.borderColor = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: '18px', height: '18px', fontSize: '16px' }}
                  >
                    {icon}
                  </span>
                  {label}
                </a>
              ))}
            </div>

            <div className="flex gap-3 text-xl">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-pink-400 transition-colors"
              >
                <FaInstagram />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="hover:text-white transition-colors"
              >
                <FaXTwitter />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="hover:text-blue-500 transition-colors"
              >
                <FaFacebook />
              </a>
            </div>
          </div>

          {compact && (
            <div className="col-span-3 flex justify-center mt-1">
              <FaAnglesDown
                className="text-white/50 animate-bounce"
                style={{ fontSize: '1.1rem' }}
              />
            </div>
          )}

          {/* Niveau 2 — Titres */}
          {!compact && (
            <>
              <h3 className="text-white font-semibold mt-4" style={{ fontSize: '1.125rem' }}>
                Contact
              </h3>
              <h3 className="text-white font-semibold mt-4" style={{ fontSize: '1.125rem' }}>
                Aide &amp; Assistance
              </h3>
              <h3 className="text-white font-semibold mt-4" style={{ fontSize: '1.125rem' }}>
                Informations
              </h3>
            </>
          )}

          {/* Contenu — masqué en mode compact */}
          {!compact && (
            <>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <FaPhone className="text-blue-400" />
                  <span>+33 (0)2 00 66 77 89</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaEnvelope className="text-blue-400" />
                  <a
                    href="mailto:contact@sailingloc.fr"
                    className="hover:text-white transition-colors"
                  >
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
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Comment trouver et réserver un bateau ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Quels documents sont requis pour louer ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Comment annuler ou modifier une réservation ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Quels modes de paiement sont acceptés ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Comment mettre mon bateau en location ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Les bateaux sont-ils assurés pendant la location ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Comment laisser un avis après ma location ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Que faire en cas d&apos;incident en mer ?
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Une autre question ? Contactez-nous en direct
                  </a>
                </li>
                <li className="pt-1 border-t border-white/20">
                  <a
                    href="#"
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <FaCircleInfo className="text-blue-400 flex-shrink-0" />
                    <span>Information complémentaire</span>
                  </a>
                </li>
              </ul>

              <ul className="space-y-2 text-sm">
                <li>Fondée en 2023</li>
                <li>📍12 Quai du Port, 13002 Marseille, France</li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Conditions générales d&apos;utilisation
                  </a>
                </li>
              </ul>
            </>
          )}
        </div>

        {/* Copyright */}
        {!compact && (
          <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-white/20">
            <p
              className="text-white/60 flex items-center gap-1 whitespace-nowrap"
              style={{ fontSize: '0.75rem' }}
            >
              © 2023–2026 SailingLoc. Tous droits réservés.{' '}
              <FaTriangleExclamation className="text-yellow-400/70 shrink-0" />
              <span className="text-white/40">
                Projet fictif à des fins pédagogiques — aucun achat/réservation réelle. Toute
                ressemblance avec un site existant est fortuite.
              </span>
            </p>
          </div>
        )}
      </footer>
    </>
  );
};

export default Footer;
