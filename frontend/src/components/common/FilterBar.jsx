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
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: 'rgba(14,165,233,0.95)' }}
    >
      {label}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex items-center hover:opacity-70 transition-opacity"
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
      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
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
      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
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

  return (
    <div className="relative block w-full lg:static" ref={containerRef}>
      {/* Header — always visible */}
      <div
        className={`flex w-full cursor-pointer select-none flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 transition-colors sm:gap-3 sm:rounded-full sm:px-4 lg:py-3 ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
        style={{
          backgroundColor: compact
            ? 'rgba(0,0,0,0.45)'
            : light
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
          borderColor: compact
            ? 'rgba(255,255,255,0.15)'
            : light
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.1)',
          backdropFilter: compact ? 'blur(5px)' : 'blur(40px)',
          WebkitBackdropFilter: compact ? 'blur(14px)' : 'blur(40px)',
        }}
        onClick={() => setFilterOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <FaSliders className={light ? 'text-white/80' : 'text-black/70'} size={13} />
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide ${light ? 'text-white' : 'text-black'}`}
          >
            {t('filterBar.label')}
          </span>
        </div>

        {activeChips.length > 0 && (
          <>
            <div className={`w-px h-3 ${light ? 'bg-white/30' : 'bg-black/20'}`} />
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {activeChips.slice(0, 2).map((chip) => (
                <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
              ))}
              {activeChips.length > 2 && (
                <span
                  className={`text-[10px] font-semibold ${light ? 'text-white/70' : 'text-black/50'}`}
                >
                  ...
                </span>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className={`text-[10px] font-medium transition-colors uppercase tracking-wide ${light ? 'text-white/70 hover:text-white' : 'text-black/60 hover:text-black'}`}
          >
            {t('filterBar.reset')}
          </button>
          {filterOpen ? (
            <FaChevronUp size={9} className={light ? 'text-white/70' : 'text-black/50'} />
          ) : (
            <FaChevronDown size={9} className={light ? 'text-white/70' : 'text-black/50'} />
          )}
        </div>
      </div>

      {/* Expanded filter panel */}
      {filterOpen && (
        <div
          className="relative z-30 mb-6 mt-2 w-full overflow-visible rounded-xl p-4 sm:p-6 lg:absolute lg:left-16 lg:right-16 lg:top-full lg:mb-0 lg:w-auto xl:left-28 xl:right-28"
          style={{
            backgroundColor: 'rgba(255,255,255,0.98)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          <div className="grid grid-cols-1 gap-6 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x-0 sm:divide-y-0 xl:flex xl:gap-0 xl:divide-x">
            {/* Type de bateau */}
            <div className="pb-6 sm:pb-0 sm:pr-6 xl:pr-10">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
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
            <div className="py-6 sm:px-6 sm:py-0 xl:px-10">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
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
            <div className="py-6 sm:px-6 sm:py-0 xl:px-10">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                {t('filterBar.price.title')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder={t('filterBar.price.min')}
                  value={priceRange.min}
                  onChange={(e) => onPriceRangeChange({ ...priceRange, min: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-sky-400 sm:w-20 sm:flex-none"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder={t('filterBar.price.max')}
                  value={priceRange.max}
                  onChange={(e) => onPriceRangeChange({ ...priceRange, max: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-sky-400 sm:w-20 sm:flex-none"
                />
              </div>
            </div>

            {/* Trier par */}
            <div className="pt-6 sm:pl-6 sm:pt-0 xl:pl-10">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
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
