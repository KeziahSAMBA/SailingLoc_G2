import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Conditions Générales d'Utilisation — règles d'usage de la plateforme
// (les conditions financières relèvent des CGV).
function CguPage() {
  return (
    <LegalLayout
      title="Conditions générales d'utilisation"
      updated="9 juillet 2026"
      updatedIso="2026-07-09"
    >
      <LegalSection title="1. Objet">
        <p>
          Les présentes CGU encadrent l’utilisation de la plateforme SailingLoc, qui met en relation
          des propriétaires de bateaux et des locataires. SailingLoc agit en qualité d’intermédiaire
          : elle n’est ni propriétaire des bateaux proposés, ni partie aux contrats de location
          conclus entre utilisateurs.
        </p>
        <p>
          L’utilisation du site vaut acceptation pleine et entière des présentes CGU. Les conditions
          financières (réservation, paiement, annulation) sont détaillées dans les{' '}
          <a href="/cgv" className="text-sky-700 hover:underline">
            CGV
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Accès au service et création de compte">
        <p>
          La consultation des annonces est libre. La réservation, la publication d’annonces, la
          messagerie et les avis nécessitent un compte. Deux profils existent :{' '}
          <strong>locataire</strong> et <strong>propriétaire</strong>.
        </p>
        <p>
          L’utilisateur s’engage à fournir des informations exactes et à jour, à être majeur, et à
          garder ses identifiants confidentiels. Toute activité effectuée depuis son compte est
          réputée être de son fait. L’adresse email est vérifiée à l’inscription.
        </p>
      </LegalSection>

      <LegalSection title="3. Documents requis pour louer">
        <p>
          La location d’un bateau nécessite le dépôt préalable de justificatifs : permis bateau
          (côtier ou fluvial selon le bateau), pièce d’identité en cours de validité et CV nautique.
          Ces documents sont vérifiés par l’équipe SailingLoc sous 48 h ouvrées ; une réservation ne
          peut être confirmée sans documents valides.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations des propriétaires">
        <p>
          Le propriétaire garantit que son bateau est en bon état de navigabilité, régulièrement
          entretenu, assuré (attestation vérifiée avant publication de l’annonce) et conforme à la
          réglementation. Il s’engage à décrire fidèlement son bateau (caractéristiques, photos,
          port d’attache, disponibilités) et à honorer les réservations qu’il confirme.
        </p>
        <p>Chaque annonce est vérifiée par l’équipe SailingLoc avant d’être publiée.</p>
      </LegalSection>

      <LegalSection title="5. Obligations des locataires">
        <p>
          Le locataire s’engage à utiliser le bateau en bon père de famille, dans le respect de la
          réglementation maritime, de la capacité maximale indiquée et de la zone de navigation
          convenue. Il s’engage à restituer le bateau à la date prévue, dans l’état constaté lors de
          l’état des lieux de départ.
        </p>
      </LegalSection>

      <LegalSection title="6. Avis et contenus">
        <p>
          Après une location terminée, le locataire peut noter le bateau et laisser un commentaire.
          Les avis sont modérés avant publication. Sont interdits : les contenus illicites,
          diffamatoires, discriminatoires, publicitaires, ou sans lien avec l’expérience de
          location. SailingLoc peut retirer tout contenu contraire aux présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="7. Messagerie interne">
        <p>
          La messagerie permet les échanges entre locataires, propriétaires et le support. Elle ne
          doit pas être utilisée pour contourner la plateforme (conclusion de locations hors site),
          ni pour diffuser des contenus illicites. Les conversations peuvent être consultées par
          l’équipe en cas de litige signalé.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          SailingLoc met en œuvre les moyens raisonnables pour assurer la disponibilité du service
          mais ne garantit ni l’absence d’interruption, ni l’exactitude des annonces rédigées par
          les propriétaires. La location est conclue entre le propriétaire et le locataire, seuls
          responsables de son exécution. En cas d’incident en mer, contactez le CROSS (196 ou VHF
          canal 16) avant toute autre démarche.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension et résiliation">
        <p>
          L’utilisateur peut supprimer son compte à tout moment depuis son espace ou en contactant
          le support. SailingLoc peut suspendre ou supprimer un compte en cas de manquement grave ou
          répété aux présentes CGU (faux documents, annonces trompeuses, impayés, comportement
          abusif), après notification par email sauf urgence.
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige, une solution amiable
          sera recherchée en priorité ; à défaut, les tribunaux de Marseille sont compétents, sous
          réserve des règles protectrices du consommateur.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

export default CguPage;
