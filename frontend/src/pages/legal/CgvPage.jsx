import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Conditions Générales de Vente — conditions financières de la mise en
// relation : réservation, prix, commission, paiement, annulation.
// Cohérentes avec la FAQ de la page contact (commission 10 %, annulation…).
function CgvPage() {
  return (
    <LegalLayout
      title="Conditions générales de vente"
      updated="9 juillet 2026"
      updatedIso="2026-07-09"
    >
      <LegalSection title="1. Champ d'application">
        <p>
          Les présentes CGV s’appliquent à toute réservation effectuée sur SailingLoc. SailingLoc
          agit comme intermédiaire de mise en relation : le contrat de location est conclu
          directement entre le propriétaire et le locataire. Toute réservation vaut acceptation des
          présentes CGV et des{' '}
          <a href="/cgu" className="text-sky-700 hover:underline">
            CGU
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Prix">
        <p>
          Les prix de location sont fixés librement par les propriétaires et affichés en euros,
          toutes taxes comprises, par jour de location. Le prix total (jours × tarif journalier,
          options éventuelles telles que le skipper) est récapitulé avant la validation de la
          demande de réservation.
        </p>
      </LegalSection>

      <LegalSection title="3. Commission de la plateforme">
        <p>
          SailingLoc prélève une commission de <strong>10 %</strong> sur le montant de chaque
          location, à la charge du propriétaire, déduite lors du reversement. Le montant payé par le
          locataire est celui affiché lors de la réservation.
        </p>
      </LegalSection>

      <LegalSection title="4. Réservation">
        <p>
          Le locataire envoie une demande de réservation aux dates souhaitées. Le propriétaire
          l’accepte ou la refuse ; le locataire est informé par email et dans son espace. La
          réservation n’est ferme qu’à la confirmation du propriétaire <em>et</em> à l’encaissement
          du paiement. Les documents du locataire (permis, pièce d’identité, CV nautique) doivent
          être vérifiés avant la confirmation.
        </p>
      </LegalSection>

      <LegalSection title="5. Paiement">
        <p>
          Le paiement s’effectue en ligne par carte bancaire ou virement, via notre prestataire de
          paiement sécurisé (Stripe). Il est encaissé à la confirmation de la réservation.
          SailingLoc ne stocke aucun numéro de carte bancaire. Le reversement au propriétaire,
          déduction faite de la commission, intervient après le début de la location.
        </p>
      </LegalSection>

      <LegalSection title="6. Annulation et modification">
        <p>
          <strong>Demande en attente</strong> : annulable librement et sans frais depuis l’espace «
          Mes réservations ».
        </p>
        <p>
          <strong>Réservation confirmée</strong> : contactez le propriétaire via la messagerie pour
          convenir d’une modification ou d’une annulation. En cas de désaccord, l’équipe SailingLoc
          peut arbitrer via l’ouverture d’un litige ; le remboursement éventuel dépend du délai de
          prévenance et des circonstances (météo rendant la navigation dangereuse, avarie du
          bateau…).
        </p>
        <p>
          <strong>Annulation par le propriétaire</strong> : le locataire est intégralement
          remboursé.
        </p>
      </LegalSection>

      <LegalSection title="7. Droit de rétractation">
        <p>
          Conformément à l’article L221-28 12° du Code de la consommation, le droit de rétractation
          de 14 jours ne s’applique pas aux prestations de services de loisirs fournies à une date
          ou période déterminée. Les conditions d’annulation de l’article 6 s’appliquent en lieu et
          place.
        </p>
      </LegalSection>

      <LegalSection title="8. Assurance et état des lieux">
        <p>
          Chaque bateau proposé est couvert par l’assurance de son propriétaire (attestation
          vérifiée avant publication). Un état des lieux contradictoire est réalisé à la remise des
          clés et à la restitution. Les dommages constatés à la restitution et non signalés au
          départ sont à la charge du locataire, dans les conditions convenues avec le propriétaire.
        </p>
      </LegalSection>

      <LegalSection title="9. Litiges et médiation">
        <p>
          En cas de litige lié à une location, ouvrez un litige depuis votre espace ou contactez le
          support : l’équipe SailingLoc instruit le dossier (échanges de la messagerie, états des
          lieux, justificatifs) et propose une résolution. Conformément aux articles L611-1 et
          suivants du Code de la consommation, le consommateur peut recourir gratuitement à un
          médiateur de la consommation. Plateforme européenne de règlement en ligne des litiges :{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 hover:underline"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p>
          Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, les
          tribunaux de Marseille sont compétents, sous réserve des règles protectrices du
          consommateur.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

export default CgvPage;
