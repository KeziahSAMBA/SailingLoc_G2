// Indicateur de chargement du thème verre : anneau Bleu Ciel + libellé.
// L'anneau s'immobilise en mode « animations réduites », le libellé reste.
function Spinner({ label }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-10">
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-glass/20 border-t-[#5AB4EC] motion-reduce:animate-none"
      />
      <span className="text-sm text-on-dark/70">{label}</span>
    </div>
  );
}

export default Spinner;
