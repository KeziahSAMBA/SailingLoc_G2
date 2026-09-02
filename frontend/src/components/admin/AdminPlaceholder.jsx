import { useTranslation } from 'react-i18next';

function AdminPlaceholder({ title, description, action }) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-dark">{title}</h1>
          {description && <p className="mt-1 text-sm text-on-dark/70">{description}</p>}
        </div>
        {action}
      </div>

      <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-glass/30 bg-surface/5 p-10 text-center">
        <p className="text-on-dark/80">{t('adminPlaceholder.building')}</p>
        <p className="mt-2 text-sm text-on-dark/60">{t('adminPlaceholder.soon')}</p>
      </div>
    </section>
  );
}

export default AdminPlaceholder;
