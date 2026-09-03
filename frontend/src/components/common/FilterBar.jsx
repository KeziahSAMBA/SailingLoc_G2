import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSliders } from 'react-icons/fa6';
import { FaChevronDown, FaChevronUp, FaXmark } from 'react-icons/fa6';

function getBoatTypeLabels(t) {
  return {
    voilier: t('filterBar.boatType.voilier'),
    catamaran: t('filterBar.boatType.catamaran'),
    trimaran: t('filterBar.boatType.trimaran'),
    moteur: t('filterBar.boatType.moteur'),
    peniche: t('filterBar.boatType.peniche'),
    jet_ski: t('filterBar.boatType.jet_ski'),
    hors_bord: t('filterBar.boatType.hors_bord'),
    gulet: t('filterBar.boatType.gulet'),
  };
}

function getSortLabels(t) {
  return {
    rating: t('filterBar.sort.rating'),
    popularity: t('filterBar.sort.popularity'),
  };
}

function FilterChip({ label, onRemove }) {
  return (
    <span
      className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-semibold text-on-dark"
      style={{ backgroundColor: 'rgba(14,165,233,0.95)' }}
    >
      {label}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex flex-shrink-0 items-center hover:opacity-70 transition-opacity"
      >
        <FaXmark size={9} />
      </button>
    </span>
  );
}

function FilterCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 accent-sky-500 cursor-pointer"
      />
      <span className="text-sm text-content-muted group-hover:text-content transition-colors">
        {label}
      </span>
    </label>
  );
}

function FilterRadio({ name, label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer group">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 accent-sky-500 cursor-pointer"
      />
      <span className="text-sm text-content-muted group-hover:text-content transition-colors">
        {label}
      </span>
    </label>
  );
}

function FilterBar({
  light = false,
  compact = false,
  boatTypeFilters,
  onBoatTypeChange,
  licenseFilter,
  onLicenseFilterChange,
  skipperFilter,
  onSkipperFilterChange,
  sortBy,
  onSortByChange,
  priceRange,
  onPriceRangeChange,
  coupDeCoeurFilter,
  onCoupDeCoeurFilterChange,
  onReset,
}) {
  const { t } = useTranslation();
  const [filterOpen, setFilterOpen] = useState(false);
  const containerRef = useRef(null);
  const boatTypeLabels = getBoatTypeLabels(t);
  const sortLabels = getSortLabels(t);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Largeur de la pastille pilotée en JS : ajouter/retirer un chip change sa
  // largeur "naturelle", qu'un simple width:auto ne sait pas animer en CSS.
  // ghostRef mesure cette largeur naturelle sur une copie invisible (w-max,
  // jamais contrainte) pendant que la pastille visible transitionne vers
  // cette valeur, chips réels inclus (pas de "trou" ni de bord manquant
  // pendant l'anim, contrairement à une pastille vide qui se contenterait
  // de révéler/masquer un clone).
  const ghostRef = useRef(null);
  const [headerWidth, setHeaderWidth] = useState(null);

  useEffect(() => {
    const el = ghostRef.current;
    if (!el || typeof window === 'undefined' || !window.ResizeObserver) return undefined;
    // +2px : marge de sécurité contre l'arrondi sous-pixel d'offsetWidth —
    // sans elle, un chip pile à la limite peut se faire couper un mot et
    // repasser à la ligne au lieu de rester sur une seule ligne.
    const observer = new window.ResizeObserver(() => setHeaderWidth(el.offsetWidth + 2));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeChips = [
    ...Object.entries(boatTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => ({
        key: k,
        label: boatTypeLabels[k],
        onRemove: () => onBoatTypeChange({ ...boatTypeFilters, [k]: false }),
      })),
    ...(licenseFilter !== 'any'
      ? [
          {
            key: 'license',
            label:
              licenseFilter === 'not_required'
                ? t('filterBar.license.chipNotRequired')
                : t('filterBar.license.chipRequired'),
            onRemove: () => onLicenseFilterChange('any'),
          },
        ]
      : []),
    ...(skipperFilter !== 'any'
      ? [
          {
            key: 'skipper',
            label:
              skipperFilter === 'included'
                ? t('filterBar.skipper.included')
                : t('filterBar.skipper.chipExcluded'),
            onRemove: () => onSkipperFilterChange('any'),
          },
        ]
      : []),
    ...(priceRange.min || priceRange.max
      ? [
          {
            key: 'price',
            label:
              priceRange.min && priceRange.max
                ? t('filterBar.price.range', { min: priceRange.min, max: priceRange.max })
                : priceRange.min
                  ? t('filterBar.price.from', { price: priceRange.min })
                  : t('filterBar.price.upTo', { price: priceRange.max }),
            onRemove: () => onPriceRangeChange({ min: '', max: '' }),
          },
        ]
      : []),
    ...(sortBy !== 'relevance'
      ? [{ key: 'sort', label: sortLabels[sortBy], onRemove: () => onSortByChange('relevance') }]
      : []),
    ...(coupDeCoeurFilter
      ? [
          {
            key: 'coup_de_coeur',
            label: t('filterBar.coupDeCoeur'),
            onRemove: () => onCoupDeCoeurFilterChange(false),
          },
        ]
      : []),
  ];

  const headerContent = (
    <>
      <div className="flex flex-shrink-0 items-center gap-2">
        <FaSliders
          className={compact ? 'text-[#0A527A]' : light ? 'text-on-dark/80' : 'text-on-light/70'}
          size={13}
        />
        <span
          className={`hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide sm:inline ${compact ? 'text-[#0A527A]' : light ? 'text-on-dark' : 'text-on-light'}`}
        >
          {t('filterBar.label')}
        </span>
      </div>

      {activeChips.length > 0 && (
        <div className="hidden sm:contents">
          <div className={`h-3 w-px flex-shrink-0 ${light ? 'bg-surface/30' : 'bg-overlay/20'}`} />
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {activeChips.slice(0, 2).map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
            {activeChips.length > 2 && (
              <span
                className={`whitespace-nowrap text-[10px] font-semibold ${light ? 'text-on-dark/70' : 'text-on-light/50'}`}
              >
                ...
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-shrink-0 items-center gap-3 ml-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          className={`whitespace-nowrap text-[10px] font-semibold transition-colors uppercase tracking-wide ${compact ? 'text-[#0A527A] hover:text-sky-800' : light ? 'text-on-dark/70 hover:text-on-dark' : 'text-on-light/60 hover:text-on-light'}`}
        >
          {t('filterBar.reset')}
        </button>
        {filterOpen ? (
          <FaChevronUp
            size={9}
            className={compact ? 'text-[#0A527A]' : light ? 'text-on-dark/70' : 'text-on-light/50'}
          />
        ) : (
          <FaChevronDown
            size={9}
            className={compact ? 'text-[#0A527A]' : light ? 'text-on-dark/70' : 'text-on-light/50'}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="relative block w-full lg:static" ref={containerRef}>
      {/* Copie invisible, jamais contrainte (w-max), qui sert uniquement à
          mesurer via ResizeObserver la largeur naturelle du header — la
          pastille visible ci-dessous anime sa largeur vers cette mesure. */}
      <div
        ref={ghostRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex w-max flex-nowrap items-center gap-1.5 rounded-full border px-3 py-3.5 sm:gap-3 sm:px-4 sm:py-2 lg:py-3"
      >
        {headerContent}
      </div>

      {/* Header — always visible */}
      <div
        className={`flex cursor-pointer select-none flex-nowrap items-center gap-1.5 overflow-hidden rounded-full border px-3 py-3.5 sm:gap-3 sm:px-4 sm:py-2 lg:py-3 ${light ? 'hover:bg-surface/10' : 'hover:bg-overlay/10'}`}
        style={{
          width: headerWidth != null ? `${headerWidth}px` : undefined,
          backgroundColor: compact
            ? 'transparent'
            : light
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
          borderColor: compact
            ? 'transparent'
            : light
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.1)',
          backdropFilter: compact ? 'none' : 'blur(40px)',
          WebkitBackdropFilter: compact ? 'none' : 'blur(40px)',
          transition:
            'width 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
        }}
        onClick={() => setFilterOpen((v) => !v)}
      >
        {headerContent}
      </div>

      {/* Expanded filter panel */}
      {filterOpen && (
        <div
          className="fixed inset-x-4 z-30 max-h-[70vh] overflow-y-auto rounded-xl p-4 sm:inset-x-8 sm:p-6 lg:absolute lg:inset-x-auto lg:left-16 lg:right-16 lg:!top-full lg:mt-2 lg:max-h-none lg:w-auto lg:overflow-visible xl:left-28 xl:right-28"
          style={{
            top: compact
              ? 'calc(var(--category-header-height) + 0.5rem)'
              : 'calc(var(--category-header-height) + 1.25rem)',
            backgroundColor: 'rgba(255,255,255,0.98)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          <div className="grid grid-cols-2 gap-6 xl:flex xl:gap-0 xl:divide-x xl:divide-gray-100">
            {/* Type de bateau */}
            <div className="xl:pr-10">
              <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-3">
                {t('filterBar.boatType.title')}
              </p>
              <div className="space-y-1.5">
                {Object.entries(boatTypeLabels).map(([key, label]) => (
                  <FilterCheckbox
                    key={key}
                    label={label}
                    checked={boatTypeFilters[key]}
                    onChange={(e) =>
                      onBoatTypeChange({ ...boatTypeFilters, [key]: e.target.checked })
                    }
                  />
                ))}
              </div>
            </div>

            {/* Permis */}
            <div className="xl:px-10">
              <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-3">
                {t('filterBar.license.title')}
              </p>
              <div className="space-y-1.5">
                <FilterCheckbox
                  label={t('filterBar.license.notRequired')}
                  checked={licenseFilter === 'not_required'}
                  onChange={(e) => onLicenseFilterChange(e.target.checked ? 'not_required' : 'any')}
                />
                <FilterCheckbox
                  label={t('filterBar.license.required')}
                  checked={licenseFilter === 'required'}
                  onChange={(e) => onLicenseFilterChange(e.target.checked ? 'required' : 'any')}
                />
                <FilterCheckbox
                  label={t('filterBar.skipper.included')}
                  checked={skipperFilter === 'included'}
                  onChange={(e) => onSkipperFilterChange(e.target.checked ? 'included' : 'any')}
                />
                <FilterCheckbox
                  label={t('filterBar.skipper.excluded')}
                  checked={skipperFilter === 'excluded'}
                  onChange={(e) => onSkipperFilterChange(e.target.checked ? 'excluded' : 'any')}
                />
              </div>
            </div>

            {/* Prix par jour */}
            <div className="xl:px-10">
              <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-3">
                {t('filterBar.price.title')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder={t('filterBar.price.min')}
                  value={priceRange.min}
                  onChange={(e) => onPriceRangeChange({ ...priceRange, min: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-field-border bg-surface text-content px-2 py-1 text-sm outline-none focus:border-action-bright sm:w-20 sm:flex-none"
                />
                <span className="text-field-placeholder">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder={t('filterBar.price.max')}
                  value={priceRange.max}
                  onChange={(e) => onPriceRangeChange({ ...priceRange, max: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-field-border bg-surface text-content px-2 py-1 text-sm outline-none focus:border-action-bright sm:w-20 sm:flex-none"
                />
              </div>
            </div>

            {/* Trier par */}
            <div className="xl:pl-10">
              <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-3">
                {t('filterBar.sort.title')}
              </p>
              <div className="space-y-1.5">
                <FilterRadio
                  name="sortBy"
                  label={t('filterBar.sort.relevance')}
                  checked={sortBy === 'relevance'}
                  onChange={() => onSortByChange('relevance')}
                />
                <FilterRadio
                  name="sortBy"
                  label={t('filterBar.sort.rating')}
                  checked={sortBy === 'rating'}
                  onChange={() => onSortByChange('rating')}
                />
                <FilterRadio
                  name="sortBy"
                  label={t('filterBar.sort.popularity')}
                  checked={sortBy === 'popularity'}
                  onChange={() => onSortByChange('popularity')}
                />
                <FilterCheckbox
                  label={t('filterBar.coupDeCoeur')}
                  checked={coupDeCoeurFilter}
                  onChange={(e) => onCoupDeCoeurFilterChange(e.target.checked)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
