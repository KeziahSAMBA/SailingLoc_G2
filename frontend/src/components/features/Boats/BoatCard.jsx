function BoatCard({ boat }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{boat.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{boat.location}</p>
      <p className="mt-4 text-slate-800">{boat.description}</p>
      <div className="mt-4 text-sm font-semibold text-slate-900">
        {boat.price} € / jour
      </div>
    </article>
  );
}

export default BoatCard;
