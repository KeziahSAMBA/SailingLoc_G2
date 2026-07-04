import logo from '../../../../assets/image/SL_logo/logo SL.webp';
import logoLong from '../../../../assets/image/SL_logo/logo SL long.webp';

function HeaderLogo({ scrolled, onClick }) {
  return (
    <a href="/" onClick={onClick} className="flex items-center">
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
  );
}

export default HeaderLogo;
