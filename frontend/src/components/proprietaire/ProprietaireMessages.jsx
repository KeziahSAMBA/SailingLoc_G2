import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import Messenger from '../messages/Messenger.jsx';

function ProprietaireMessages() {
  const { t } = useTranslation();
  // Conversation à ouvrir directement (ex. bouton « chat » de la page Contact).
  const { state } = useLocation();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireMessages.pageTitle');
  }, [t]);

  return (
    <section aria-labelledby="messages-title">
      <header className="mb-6">
        <h1 id="messages-title" className="text-2xl font-bold text-white">
          {t('proprietaireMessages.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('proprietaireMessages.subtitle')}</p>
      </header>

      <Messenger externalUser={state?.openUser || null} />
    </section>
  );
}

export default ProprietaireMessages;
