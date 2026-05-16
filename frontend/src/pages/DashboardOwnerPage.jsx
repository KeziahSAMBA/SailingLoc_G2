import { useEffect, useState } from 'react';
import { fetchBoats } from '../services/boatService.js';
import BoatCard from '../components/features/Boats/BoatCard.jsx';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

function DashboardOwnerPage() {
  const [boats, setBoats] = useState([]);

  useEffect(() => {
    fetchBoats()
      .then((response) => setBoats(response.data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <main
      className="w-full min-h-screen"
      style={{
        backgroundImage: `url(${bateauBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full min-h-screen bg-black/10 px-16 pt-[120px] pb-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard propriétaire</h1>
          <p className="mt-2 text-gray-300">Gestion des annonces, réservations et paiements.</p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {boats.length === 0 ? (
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-8 text-gray-200">
              Aucune annonce pour le moment.
            </div>
          ) : (
            boats.map((boat) => <BoatCard key={boat.id} boat={boat} />)
          )}
        </section>
      </div>
    </main>
  );
}

export default DashboardOwnerPage;
