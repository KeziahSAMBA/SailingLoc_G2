import { useState, useEffect, useRef } from 'react';
import logo from '../../../assets/image/SL_logo/logo SL.webp';
import logoLong from '../../../assets/image/SL_logo/logo SL long.webp';

const BURGER_ITEMS = [
  'Chercher une location',
  'Tutoriel',
  'Nos suggestions',
  'Avis & commentaires',
];

function Header() {
  const [lang, setLang] = useState('FR');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 flex items-center px-12"
      style={{
        height: scrolled ? '60px' : '80px',
        backgroundColor: scrolled ? 'rgba(10, 49, 114, 0.95)' : 'rgba(255, 255, 255, 0.01)',
        borderBottom: '1px solid rgba(90, 180, 236, 0.2)',
        boxShadow: scrolled ? '0 2px 12px rgba(10, 49, 114, 0.08)' : 'none',
        transition: 'height 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
      }}
    >
      {/* Gauche — Burger + Logo (33%) */}
      <div className="w-1/3 flex items-center gap-4 pl-4">
        {/* Burger */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1"
            aria-label="Menu"
          >
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none' }}
            />
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ opacity: menuOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }}
            />
          </button>

          {/* Dropdown — panneau latéral gauche */}
          <div
            className="fixed left-0 overflow-hidden"
            style={{
              top: scrolled ? '60px' : '80px',
              width: '260px',
              height: `calc(100vh - ${scrolled ? '60px' : '80px'})`,
              backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
              transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
              pointerEvents: menuOpen ? 'auto' : 'none',
              transition: `top 0.3s ease, height 0.3s ease, transform 0.3s ease`,
            }}
          >
            <div className="flex flex-col" style={{ height: '55%' }}>
              {BURGER_ITEMS.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="flex items-center flex-1 px-5 text-base font-medium transition-colors"
                  style={{ color: scrolled ? '#0A3172' : '#fff' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = scrolled
                      ? 'rgba(10, 49, 114, 0.06)'
                      : 'rgba(255, 255, 255, 0.1)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Logo décalé légèrement à droite */}
        <a href="/" className="flex items-center">
          <img
            src={scrolled ? logoLong : logo}
            alt="SailingLoc"
            style={{
              height: scrolled ? '40px' : '54px',
              transition: 'height 0.3s ease',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </a>
      </div>

      {/* Centre — Navigation (33%) */}
      <nav className="w-1/3 flex justify-center">
        <ul className="flex gap-10 list-none m-0 p-0">
          {[
            ['Découvrir', '/'],
            ['Contact', '/contact'],
            ['À propos', '/a-propos'],
          ].map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                className="font-medium"
                style={{
                  color: '#fff',
                  fontSize: scrolled ? '0.85rem' : '1.05rem',
                  backgroundImage: 'linear-gradient(#fff, #fff)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '0% 1px',
                  backgroundPosition: '0 100%',
                  transition: 'font-size 0.3s ease, background-size 0.35s ease',
                  paddingBottom: '3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundSize = '100% 1px';
                  e.currentTarget.style.opacity = '0.75';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundSize = '0% 1px';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Droite — Langue + Connexion (33%) */}
      <div className="w-1/3 flex items-center justify-end gap-4 pr-4">
        <div className="flex items-center gap-1">
          {['FR', 'EN'].map((l, i) => (
            <span key={l} className="flex items-center gap-1">
              {i === 1 && (
                <span style={{ color: '#fff', opacity: 0.4, fontSize: '0.6rem' }}>/</span>
              )}
              <button
                onClick={() => setLang(l)}
                className="px-1 font-medium"
                style={{
                  color: '#fff',
                  opacity: lang === l ? 1 : 0.45,
                  fontWeight: lang === l ? 700 : 500,
                  fontSize: scrolled ? '0.6rem' : '0.65rem',
                  backgroundImage: 'linear-gradient(#fff, #fff)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '0% 1px',
                  backgroundPosition: '0 100%',
                  paddingBottom: '2px',
                  transition: 'font-size 0.3s ease, background-size 0.35s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundSize = '100% 1px')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundSize = '0% 1px')}
              >
                {l}
              </button>
            </span>
          ))}
        </div>

        <button
          className="flex items-center gap-2 rounded-full transition-all whitespace-nowrap"
          style={{
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            backgroundColor: 'transparent',
            fontSize: scrolled ? '0.65rem' : '0.7rem',
            padding: scrolled ? '4px 10px' : '6px 12px',
            transition:
              'font-size 0.3s ease, padding 0.3s ease, background-color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.borderColor = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
          }}
        >
          <span
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              width: scrolled ? '14px' : '16px',
              height: scrolled ? '14px' : '16px',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              transition: 'width 0.3s ease, height 0.3s ease',
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </span>
          Se connecter / S&apos;inscrire
        </button>
      </div>
    </header>
  );
}

export default Header;
