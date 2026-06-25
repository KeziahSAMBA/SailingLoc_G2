import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';

function DateInput({ label }) {
  return (
    <div className="group flex flex-col justify-center px-5 py-0.5 mx-0.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer">
      <span className="text-black text-[10px] font-semibold uppercase tracking-wide mb-0.5">
        {label}
      </span>
      <input
        type="date"
        className="bg-transparent text-black/80 outline-none text-xs cursor-pointer"
      />
    </div>
  );
}

function SearchBarV2() {
  const [destination, setDestination] = useState('');

  return (
    <div
      className="flex items-stretch rounded-full shadow-xl max-w-4xl p-0.5 gap-0 border"
      style={{
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderColor: 'rgba(0,0,0,0.1)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-0.5 mx-0.5 rounded-full hover:bg-black/10 transition-colors">
        <span className="text-black text-[10px] font-semibold uppercase tracking-wide mb-0.5">
          Destination
        </span>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Lieu / Port de départ"
          className="bg-transparent text-black placeholder-black/50 outline-none text-xs"
        />
      </div>

      <div className="w-px bg-black/20 self-center h-5" />
      <DateInput label="Dates arrivée" />
      <div className="w-px bg-black/20 self-center h-5" />
      <DateInput label="Dates retour" />
      <div className="w-px bg-black/20 self-center h-5" />

      <div className="flex flex-col justify-center px-5 py-0.5 mx-0.5 rounded-full hover:bg-black/10 transition-colors">
        <span className="text-black text-[10px] font-semibold uppercase tracking-wide mb-0.5">
          Voyageurs
        </span>
        <input
          type="number"
          min="1"
          placeholder="Nombre de personnes"
          className="w-29 bg-transparent text-black placeholder-black/50 outline-none text-xs"
        />
      </div>

      <button className="flex items-center gap-2 bg-sky-700/50 hover:bg-sky-900 text-white px-5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap">
        <FiSearch size={14} />
        Rechercher
      </button>
    </div>
  );
}

export default SearchBarV2;
