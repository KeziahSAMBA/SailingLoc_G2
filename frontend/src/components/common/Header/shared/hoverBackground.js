// Handlers pour un fond (et, optionnellement, une bordure) qui change au
// survol via currentTarget.style — évite un re-render pour un simple hover.
export function hoverBackground(hoverColor, baseColor = 'transparent', border) {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = hoverColor;
      if (border) e.currentTarget.style.borderColor = border.hover;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = baseColor;
      if (border) e.currentTarget.style.borderColor = border.base;
    },
  };
}
