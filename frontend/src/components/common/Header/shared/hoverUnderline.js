// Style + handlers du soulignement animé au survol des liens de nav (barre
// blanche qui se déploie sous le texte).
export function hoverUnderlineStyle({ fontSize, baseOpacity = 1, ...extra }) {
  return {
    color: 'rgb(var(--sl-header-text))',
    fontSize,
    opacity: baseOpacity,
    backgroundImage: 'linear-gradient(rgb(var(--sl-header-text)), rgb(var(--sl-header-text)))',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '0% 1px',
    backgroundPosition: '0 100%',
    transition: 'font-size 0.3s ease, background-size 0.35s ease',
    paddingBottom: '3px',
    ...extra,
  };
}

export function hoverUnderlineHandlers(baseOpacity = 1) {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundSize = '100% 1px';
      e.currentTarget.style.opacity = '0.75';
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundSize = '0% 1px';
      e.currentTarget.style.opacity = String(baseOpacity);
    },
  };
}
