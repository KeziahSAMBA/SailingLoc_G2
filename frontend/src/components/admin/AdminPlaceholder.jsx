function AdminPlaceholder({ title, description, action }) {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {action}
      </div>

      <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
        <p className="text-slate-300">Cette section est en cours de construction.</p>
        <p className="mt-2 text-sm text-slate-500">
          L&apos;interface et les fonctionnalités seront bientôt disponibles.
        </p>
      </div>
    </section>
  );
}

export default AdminPlaceholder;
