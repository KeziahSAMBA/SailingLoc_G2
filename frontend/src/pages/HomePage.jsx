import { useEffect, useState } from 'react';
import { fetchBoats } from '../services/boatService.js';
import BoatCard from '../components/features/Boats/BoatCard.jsx';
import bateauVideo from '../assets/video/video_bateau_3.mp4';
import SearchBar from '../components/common/SearchBar.jsx';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import logoLong from '../assets/image/SL_logo/logo SL long.webp';

function HomePage() {
  const [boats, setBoats] = useState([]);
  useEffect(() => {
    fetchBoats()
      .then((response) => setBoats(response.data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <main className="w-full">
      {/* Section 1 — Hero */}
      <section className="relative w-full min-h-screen flex flex-col overflow-hidden px-4">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={bateauVideo}
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Titres + Search bar + CTA — centrés verticalement */}
        <div className="relative flex-1 flex flex-col items-center justify-center gap-14 text-center">
          <div>
            <img src={logoLong} alt="SailingLoc" className="h-16 mx-auto mb-4" />
            <p className="text-gray-300 text-base">
              Réservez le bateau de vos rêves auprès de propriétaires passionnés dans tous les ports
              de France
            </p>
          </div>
          <SearchBar />
          <div className="text-center">
            <p className="text-white/70 text-xs mb-2 tracking-widest uppercase">
              Rejoignez notre application mobile
            </p>
            <div className="flex justify-center gap-2">
              {[
                { icon: <SiAppstore />, label: 'App Store', href: 'https://apps.apple.com' },
                { icon: <SiGoogleplay />, label: 'Google Play', href: 'https://play.google.com' },
              ].map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium border border-white/40 hover:bg-white/15 hover:border-white transition-colors"
                >
                  <span className="text-sm">{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="w-full min-h-screen flex items-center justify-center bg-sky-900 px-16">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Pourquoi choisir SailingLoc ?</h2>
          <p className="text-sky-200 text-lg max-w-xl mx-auto">
            Une plateforme simple, sécurisée et pensée pour les passionnés de voile.
          </p>
        </div>
      </section>

      {/* Section 3 */}
      <section className="w-full min-h-screen flex items-center justify-center bg-teal-800 px-16">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Comment ça marche ?</h2>
          <p className="text-teal-200 text-lg max-w-xl mx-auto">
            Parcourez les annonces, contactez le propriétaire et prenez la mer en toute sérénité.
          </p>
        </div>
      </section>

      {/* Section 4 */}
      <section className="w-full min-h-screen flex items-center justify-center bg-indigo-900 px-16">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Destinations populaires</h2>
          <p className="text-indigo-200 text-lg max-w-xl mx-auto">
            Méditerranée, Atlantique, Bretagne... explorez les plus beaux coins de France.
          </p>
        </div>
      </section>

      {/* Section 5 — Annonces */}
      <section className="w-full min-h-screen bg-slate-800 px-16 py-20">
        <div className="text-center text-white mb-12">
          <h2 className="text-4xl font-bold mb-4">Prêt à larguer les amarres ?</h2>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Créez votre compte et réservez votre premier bateau dès aujourd'hui.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {boats.length === 0 ? (
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-8 text-gray-200">
              Aucune annonce pour le moment.
            </div>
          ) : (
            boats.map((boat) => <BoatCard key={boat.id} boat={boat} />)
          )}
        </div>
      </section>
    </main>
  );
}

export default HomePage;
