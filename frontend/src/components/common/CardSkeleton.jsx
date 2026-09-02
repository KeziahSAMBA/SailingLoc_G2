// Cartes fantômes affichées pendant le chargement des listes du dashboard :
// mêmes dimensions que les vraies cartes pour éviter tout saut de mise en page.
function CardSkeleton({ count = 4, height = 'h-52', withIcon = false }) {
  return (
    <ul aria-hidden className="grid gap-3 xl:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div
            className={`${height} animate-pulse rounded-2xl border border-glass/10 bg-surface/5 p-4 motion-reduce:animate-none`}
          >
            <div className="flex items-start gap-4">
              {withIcon && <div className="h-11 w-11 shrink-0 rounded-xl bg-surface/10" />}
              <div className="min-w-0 flex-1">
                <div className="h-4 w-1/3 rounded bg-surface/10" />
                <div className="mt-2 h-3 w-1/2 rounded bg-surface/10" />
                <div className="mt-4 h-3 w-2/3 rounded bg-surface/10" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default CardSkeleton;
