import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MdIosShare, MdContentCopy, MdCheck } from 'react-icons/md';
import { FaFacebookF, FaXTwitter, FaWhatsapp, FaEnvelope } from 'react-icons/fa6';

const PANEL_STYLE = {
  backgroundColor: 'rgba(20,20,30,0.85)',
  borderColor: 'rgba(255,255,255,0.2)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

// Rendu en portail (document.body) : le bouton vit dans une carte au fond
// flouté (backdrop-filter), qui crée son propre contexte d'empilement et
// plafonnerait n'importe quel z-index posé sur un enfant — le menu resterait
// derrière le panneau de réservation ou la barre sticky quel que soit son
// z-index local. Le portail sort le menu de ce contexte.
const ShareButton = memo(function ShareButton({ url, title, size = 22, className = '' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) {
        return;
      }
      setOpen(false);
    }
    function handleDismiss() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible (permissions/contexte non sécurisé) : on ignore. */
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      key: 'facebook',
      label: t('share.facebook'),
      icon: <FaFacebookF />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'x',
      label: t('share.x'),
      icon: <FaXTwitter />,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'whatsapp',
      label: t('share.whatsapp'),
      icon: <FaWhatsapp />,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      key: 'email',
      label: t('share.email'),
      icon: <FaEnvelope />,
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  // Recalculé à chaque rendu (pas mémorisé) : reflète immédiatement tout
  // ajustement des décalages ci-dessous sans besoin de fermer/rouvrir le menu.
  const rect = open ? buttonRef.current?.getBoundingClientRect() : null;
  const pos = rect
    ? // Apparaît à côté du bouton (à gauche), pas en dessous.
      { top: rect.top - 20, right: window.innerWidth - rect.left }
    : null;

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={`p-1.5 transition-transform hover:scale-110 ${className}`}
        aria-label={t('share.title')}
        aria-expanded={open}
      >
        <MdIosShare size={size} className="text-on-dark" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed w-56 rounded-xl border p-1.5 flex flex-col gap-0.5 z-[9999] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ top: pos.top, right: pos.right, ...PANEL_STYLE }}
          >
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 text-sm text-on-dark px-2.5 py-2 rounded-lg hover:bg-surface/10 transition-colors text-left"
            >
              {copied ? (
                <MdCheck className="text-success flex-shrink-0" size={16} />
              ) : (
                <MdContentCopy className="flex-shrink-0" size={16} />
              )}
              {copied ? t('share.copied') : t('share.copyLink')}
            </button>
            <div className="h-px bg-surface/15 my-1" />
            {links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-on-dark px-2.5 py-2 rounded-lg hover:bg-surface/10 transition-colors"
              >
                <span className="flex-shrink-0 text-action-bright">{l.icon}</span>
                {l.label}
              </a>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});

export default ShareButton;
