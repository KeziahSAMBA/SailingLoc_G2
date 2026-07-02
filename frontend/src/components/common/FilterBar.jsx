import { useState, useEffect, useRef } from 'react';
import { FaSliders } from 'react-icons/fa6';
import { FaChevronDown, FaChevronUp, FaXmark } from 'react-icons/fa6';

const BOAT_TYPE_LABELS = {
  voilier: 'Voiliers',
  catamaran: 'Catamarans',
  trimaran: 'Trimarans',
  moteur: 'Bateaux à moteur',
  peniche: 'Péniches',
  jet_ski: 'Jet-skis',
  hors_bord: 'Hors-bords',
  gulet: 'Gulets',
  sans_permis: 'Sans permis',
};

const EQUIPMENT_LABELS = {
  skipper: 'Skipper inclus',
  cuisine: 'Cuisine équipée',
  clim: 'Climatisation',
  wifi: 'Wifi à bord',
};

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

function FilterBar() {
  const [boatTypeFilters, setBoatTypeFilters] = useState({
    voilier: false,
    catamaran: false,
    trimaran: false,
    moteur: false,
    peniche: false,
    jet_ski: false,
    hors_bord: false,
    gulet: false,
    sans_permis: false,
  });
  const [equipmentFilters, setEquipmentFilters] = useState({
    skipper: false,
    cuisine: false,
    clim: false,
    wifi: false,
  });
  const [sansPermis, setSansPermis] = useState(false);
  const [selectedCabins, setSelectedCabins] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function resetFilters() {
    setBoatTypeFilters({
      voilier: false,
      catamaran: false,
      trimaran: false,
      moteur: false,
      peniche: false,
      jet_ski: false,
      hors_bord: false,
      gulet: false,
      sans_permis: false,
    });
    setEquipmentFilters({ skipper: false, cuisine: false, clim: false, wifi: false });
    setSansPermis(false);
    setSelectedCabins(null);
  }

  const activeChips = [
    ...Object.entries(boatTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => ({
        key: k,
        label: BOAT_TYPE_LABELS[k],
        onRemove: () => setBoatTypeFilters((f) => ({ ...f, [k]: false })),
      })),
    ...Object.entries(equipmentFilters)
      .filter(([, v]) => v)
      .map(([k]) => ({
        key: k,
        label: EQUIPMENT_LABELS[k],
        onRemove: () => setEquipmentFilters((f) => ({ ...f, [k]: false })),
      })),
    ...(sansPermis
      ? [{ key: 'sansPermis', label: 'Sans permis', onRemove: () => setSansPermis(false) }]
      : []),
    ...(selectedCabins !== null
      ? [
          {
            key: 'cabins',
            label: `${selectedCabins} cabine${selectedCabins === 1 ? '' : 's'}`,
            onRemove: () => setSelectedCabins(null),
          },
        ]
      : []),
  ];

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer select-none border hover:bg-black/10 transition-colors"
        style={{
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderColor: 'rgba(0,0,0,0.1)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        onClick={() => setFilterOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <FaSliders className="text-black/70" size={13} />
          <span className="text-black text-[10px] font-semibold uppercase tracking-wide">
            Filtres
          </span>
        </div>

        {activeChips.length > 0 && (
          <>
            <div className="w-px h-3 bg-black/20" />
            <div className="flex items-center gap-1.5 flex-nowrap">
              {activeChips.slice(0, 2).map((chip) => (
                <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
              ))}
              {activeChips.length > 2 && (
                <span className="text-[10px] font-semibold text-black/50">...</span>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetFilters();
            }}
            className="text-[10px] font-medium text-black/60 hover:text-black transition-colors uppercase tracking-wide"
          >
            Réinitialiser
          </button>
          {filterOpen ? (
            <FaChevronUp size={9} className="text-black/50" />
          ) : (
            <FaChevronDown size={9} className="text-black/50" />
          )}
        </div>
      </div>

      {/* Expanded filter panel */}
      {filterOpen && (
        <div
          className="absolute left-0 mt-2 rounded-xl p-5 z-10 w-fit"
          style={{
            backgroundColor: 'rgba(255,255,255,0.98)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          <div className="flex gap-0 divide-x divide-gray-100">
            {/* Type de bateau */}
            <div className="pr-8">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                Type de bateau
              </p>
              <div className="space-y-1.5">
                {[
                  ['voilier', 'Voiliers'],
                  ['catamaran', 'Catamarans'],
                  ['trimaran', 'Trimarans'],
                  ['moteur', 'Bateaux à moteur'],
                  ['peniche', 'Péniches'],
                  ['jet_ski', 'Jet-skis'],
                  ['hors_bord', 'Hors-bords'],
                  ['gulet', 'Gulets'],
                  ['sans_permis', 'Sans permis'],
                ].map(([key, label]) => (
                  <FilterCheckbox
                    key={key}
                    label={label}
                    checked={boatTypeFilters[key]}
                    onChange={(e) => setBoatTypeFilters((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                ))}
              </div>
            </div>

            {/* Équipements */}
            <div className="px-8">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                Équipements
              </p>
              <div className="space-y-1.5">
                {[
                  ['skipper', 'Skipper inclus'],
                  ['cuisine', 'Cuisine équipée'],
                  ['clim', 'Climatisation'],
                  ['wifi', 'Wifi à bord'],
                ].map(([key, label]) => (
                  <FilterCheckbox
                    key={key}
                    label={label}
                    checked={equipmentFilters[key]}
                    onChange={(e) =>
                      setEquipmentFilters((f) => ({ ...f, [key]: e.target.checked }))
                    }
                  />
                ))}
              </div>
            </div>

            {/* Sans permis */}
            <div className="px-8">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                Permis
              </p>
              <FilterCheckbox
                label="Sans permis requis"
                checked={sansPermis}
                onChange={(e) => setSansPermis(e.target.checked)}
              />
            </div>

            {/* Nombre de cabines */}
            <div className="pl-8">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                Nombre de cabines
              </p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, '4+'].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelectedCabins(selectedCabins === n ? null : n)}
                    className="w-9 h-9 rounded-full text-sm font-semibold border transition-all duration-200"
                    style={{
                      backgroundColor: selectedCabins === n ? 'rgba(14,165,233,0.95)' : '#fff',
                      color: selectedCabins === n ? '#fff' : '#4b5563',
                      borderColor: selectedCabins === n ? 'rgba(14,165,233,0.95)' : '#e5e7eb',
                      boxShadow: selectedCabins === n ? '0 2px 8px rgba(14,165,233,0.4)' : 'none',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
