import { useEffect, useState } from 'react';
import { fetchBoats } from '../services/boatService.js';
import BoatCard from '../components/features/Boats/BoatCard.jsx';
import bateauVideo from '../assets/video/video_bateau_3.mp4';
import SearchBar from '../components/common/SearchBar.jsx';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import logoLong from '../assets/image/SL_logo/logo SL long.webp';
import { MdVerified, MdAnchor } from 'react-icons/md';
import { FaShieldAlt, FaHandshake } from 'react-icons/fa';
import CarrouselBoat from '../components/common/CarrouselBoat.jsx';
import CarouselBoatTypes from '../components/common/CarouselBoatTypes.jsx';

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
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-[rgb(0,78,87)]" />

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

      {/* Section 2 — Carrousels bateaux & ports */}
      <section className="relative w-full min-h-screen flex flex-col justify-center gap-10 px-16 py-10 bg-[linear-gradient(to_bottom,rgb(0,78,87)_0%,#EBF5FD_50%,white_65%,white_100%)]">
        <CarouselBoatTypes />
        <CarrouselBoat />
      </section>

      {/* Section 3 — Proposition de valeur */}
      <section className="w-full min-h-screen bg-white flex flex-col items-center justify-center px-16 py-14 gap-0">
        {/* Bloc titre */}
        <div className="text-center mb-10">
          <h2 className="text-md font-semibold tracking-widest text-sky-500 uppercase mb-2 underline underline-offset-4">
            Pourquoi nous choisir ?
          </h2>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            L'expérience marine réinventée
          </h1>
        </div>

        {/* Bloc encadrés */}
        <div className="grid grid-cols-4 gap-6 w-full mb-10">
          {[
            {
              icon: <MdAnchor className="text-3xl text-sky-500" />,
              title: 'Flotte sélectionnée',
              text: 'Chaque bateau est vérifié et validé par notre équipe pour garantir qualité et sécurité à bord.',
            },
            {
              icon: <FaShieldAlt className="text-3xl text-sky-500" />,
              title: 'Paiement sécurisé',
              text: 'Vos transactions sont protégées de bout en bout. Réservez en toute confiance, sans mauvaise surprise.',
            },
            {
              icon: <FaHandshake className="text-3xl text-sky-500" />,
              title: 'Propriétaires passionnés',
              text: 'Louez directement auprès de marins expérimentés qui partagent leur passion et leurs conseils.',
            },
            {
              icon: <MdVerified className="text-3xl text-sky-500" />,
              title: 'Assistance 7j/7',
              text: 'Notre équipe est disponible à tout moment pour vous accompagner avant, pendant et après votre sortie.',
            },
          ].map(({ icon, title, text }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center gap-3 p-8 rounded-2xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_32px_rgba(10,49,114,0.95)] hover:-translate-y-1 transition-all duration-300"
            >
              <span>{icon}</span>
              <h3 className="text-sm font-bold text-gray-800">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Bouton */}
        <a
          href="#"
          className="px-4 py-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
        >
          En savoir plus
        </a>
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
