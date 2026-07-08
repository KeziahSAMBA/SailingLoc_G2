import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Messenger from '../messages/Messenger.jsx';

function LocataireMessages() {
  // Conversation à ouvrir directement (ex. bouton « chat » de la page Contact).
  const { state } = useLocation();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Messagerie — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="messages-title">
      <header className="mb-6">
        <h1 id="messages-title" className="text-2xl font-bold text-white">
          Messagerie
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Échangez avec les propriétaires de vos locations et le support SailingLoc.
        </p>
      </header>

      <Messenger externalUser={state?.openUser || null} />
    </section>
  );
}

export default LocataireMessages;
