import SpectatorFrame from './SpectatorFrame.jsx';

function AdminSpectateurLocatairePage() {
  return (
    <SpectatorFrame
      mode="locataire"
      title="Vue locataire"
      description="Aperçu live du site vu par un locataire, dans l'espace admin."
      banner={
        <>
          👁️ Vue <strong>locataire (faux compte de démo)</strong> — l'affichage se base sur ce rôle
          mais aucune vraie donnée n'est chargée. La connexion réelle depuis l'iframe est
          désactivée.
        </>
      }
    />
  );
}

export default AdminSpectateurLocatairePage;
