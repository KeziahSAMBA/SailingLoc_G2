import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';

function DateInput({ label, value, onChange, light }) {
  return (
    <div
      className={`group flex flex-col justify-center px-5 py-0.5 mx-0.5 rounded-full transition-colors cursor-pointer ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
    >
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
      >
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className={`bg-transparent outline-none text-xs cursor-pointer ${light ? 'text-white/80' : 'text-black/80'}`}
      />
    </div>
  );
}

function SearchBar({ light = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '');
  const [start, setStart] = useState(searchParams.get('start') ?? '');
  const [end, setEnd] = useState(searchParams.get('end') ?? '');
  const [travelers, setTravelers] = useState(searchParams.get('travelers') ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (travelers) params.set('travelers', travelers);
    navigate(`/categorie${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-stretch backdrop-blur- border rounded-full shadow-xl max-w-4xl mx-auto p-0.5 gap-0"
      style={{
        backgroundColor: light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderColor: light ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <div
        className={`flex-1 flex flex-col justify-center px-6 py-0.5 mx-0.5 rounded-full transition-colors ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
        >
          Destination
        </span>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Lieu / Port de départ"
          className={`bg-transparent outline-none text-xs ${light ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
        />
      </div>

      <div className={`w-px self-center h-5 ${light ? 'bg-white/20' : 'bg-black/20'}`} />
      <DateInput
        label="Dates arrivée"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        light={light}
      />
      <div className={`w-px self-center h-5 ${light ? 'bg-white/20' : 'bg-black/20'}`} />
      <DateInput
        label="Dates retour"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        light={light}
      />
      <div className={`w-px self-center h-5 ${light ? 'bg-white/20' : 'bg-black/20'}`} />

      <div
        className={`flex flex-col justify-center px-5 py-0.5 mx-0.5 rounded-full transition-colors ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
        >
          Voyageurs
        </span>
        <input
          type="number"
          min="1"
          value={travelers}
          onChange={(e) => setTravelers(e.target.value)}
          placeholder="Nombre de personnes"
          className={`w-29 bg-transparent outline-none text-xs ${light ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
        />
      </div>

      <button
        type="submit"
        className="flex items-center gap-2 bg-sky-700/50 hover:bg-sky-900 text-white px-5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
      >
        <FiSearch size={14} />
        Rechercher
      </button>
    </form>
  );
}

export default SearchBar;
