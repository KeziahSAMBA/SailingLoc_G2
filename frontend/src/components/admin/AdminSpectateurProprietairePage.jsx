import SpectatorFrame from './SpectatorFrame.jsx';

function AdminSpectateurProprietairePage() {
  return (
    <SpectatorFrame
      mode="proprietaire"
      title="Vue propriétaire"
      description="Aperçu live du site vu par un propriétaire, dans l'espace admin."
      banner={
        <>
          👁️ Vue <strong>propriétaire (faux compte de démo)</strong> — l'affichage se base sur ce
          rôle mais aucune vraie donnée n'est chargée. La connexion réelle depuis l'iframe est
          désactivée.
        </>
      }
    />
  );
}

export default AdminSpectateurProprietairePage;
