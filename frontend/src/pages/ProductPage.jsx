import { useParams } from 'react-router-dom';

function ProductPage() {
  const { id } = useParams();

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Page produit</h1>
        {id ? (
          <p className="text-base text-slate-600">
            Affichage des détails du bateau sélectionné&nbsp;:
            <span className="font-semibold"> {id}</span>
          </p>
        ) : (
          <p className="text-base text-slate-600">
            Aucune sélection de bateau. Retournez à la page catégorie et choisissez un produit.
          </p>
        )}
      </div>
    </main>
  );
}

export default ProductPage;
