export function FlagFR({ className }) {
  return (
    <svg viewBox="0 0 3 2" className={className}>
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#FFFFFF" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  );
}

export function FlagGB({ className }) {
  return (
    <svg viewBox="0 0 60 30" className={className}>
      <clipPath id="flag-gb-s">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="flag-gb-t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#flag-gb-s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#00247d" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#flag-gb-t)"
          stroke="#cf142b"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" strokeWidth="6" />
      </g>
    </svg>
  );
}
