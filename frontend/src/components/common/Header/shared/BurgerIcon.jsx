function BurgerIcon({ open }) {
  return (
    <>
      <span
        className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
        style={{ transform: open ? 'translateY(6.5px) rotate(45deg)' : 'none' }}
      />
      <span
        className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
        style={{ opacity: open ? 0 : 1 }}
      />
      <span
        className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
        style={{ transform: open ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }}
      />
    </>
  );
}

export default BurgerIcon;
