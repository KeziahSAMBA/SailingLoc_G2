import { useEffect, useState } from "react";
import { fetchBoats } from "../services/boatService.js";
import BoatCard from "../components/features/Boats/BoatCard.jsx";

function DashboardOwnerPage() {
  const [boats, setBoats] = useState([]);

  useEffect(() => {
    fetchBoats()
      .then((response) => setBoats(response.data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard propriétaire</h1>
        <p className="mt-2 text-slate-600">
          Gestion des annonces, réservations et paiements.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {boats.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            Aucune annonce pour le moment.
          </div>
        ) : (
          boats.map((boat) => <BoatCard key={boat.id} boat={boat} />)
        )}
      </section>
    </main>
  );
}

export default DashboardOwnerPage;
