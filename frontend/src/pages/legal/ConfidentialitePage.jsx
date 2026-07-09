import { useCookieConsent } from '../../hooks/useCookieConsent.jsx';
import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Politique de confidentialité (RGPD + recommandations CNIL).
// La section cookies documente exactement ce que fait la bannière de
// consentement (CookieConsentContext) et permet de rouvrir le panneau.
function ConfidentialitePage() {
  const { openPreferences } = useCookieConsent();

  return (
    <LegalLayout
      title="Politique de confidentialité"
      pageTitle="Politique de confidentialité — SailingLoc"
      updated="9 juillet 2026"
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          SailingLoc SAS, 12 Quai du Port, 13002 Marseille, est responsable du traitement des
          données collectées sur la plateforme. Contact :{' '}
          <a href="mailto:dpo@sailingloc.fr" className="text-sky-700 hover:underline">
            dpo@sailingloc.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Compte</strong> : nom, prénom, email, téléphone (facultatif), mot de passe
            (haché), photo de profil (facultative), rôle (locataire/propriétaire).
          </li>
          <li>
            <strong>Justificatifs</strong> : permis bateau, pièce d’identité, CV nautique
            (locataires) ; acte de francisation, attestation d’assurance (propriétaires).
          </li>
          <li>
            <strong>Activité</strong> : annonces, réservations, avis, messages échangés via la
            messagerie interne, demandes de contact.
          </li>
          <li>
            <strong>Paiement</strong> : traité par notre prestataire Stripe — SailingLoc ne stocke
            aucun numéro de carte bancaire.
          </li>
          <li>
            <strong>Navigation</strong> : uniquement avec votre consentement — statistiques de
            visite via notre outil Matomo auto-hébergé (voir section cookies).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Exécution du contrat</strong> : création du compte, mise en relation,
            réservations, messagerie, paiements.
          </li>
          <li>
            <strong>Obligation légale</strong> : vérification des documents de navigation,
            facturation, conservation comptable.
          </li>
          <li>
            <strong>Intérêt légitime</strong> : sécurité du service (sessions, détection de fraude),
            gestion des litiges, modération des avis.
          </li>
          <li>
            <strong>Consentement</strong> : cookies non essentiels (mesure d’audience,
            personnalisation, publicité) — retirable à tout moment.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Durées de conservation">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Compte et données associées : durée de vie du compte, puis 3 ans après la dernière
            activité.
          </li>
          <li>Justificatifs : durée de détention du compte, supprimés à sa clôture.</li>
          <li>Factures et pièces comptables : 10 ans (obligation légale).</li>
          <li>Journaux de sécurité : 12 mois.</li>
          <li>
            Données de mesure d’audience : <strong>25 mois maximum</strong> ; choix de consentement
            : <strong>6 mois</strong> ; cookies : <strong>13 mois maximum</strong>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Cookies et traceurs">
        <p>
          Au premier accès, une bannière vous permet d’accepter, de refuser, ou de paramétrer les
          cookies finalité par finalité.{' '}
          <strong>Aucun cookie soumis à consentement n’est déposé avant votre choix</strong>, et
          refuser est aussi simple qu’accepter. Votre choix est conservé 6 mois, puis redemandé.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Cookies essentiels (exemptés de consentement)</strong> : session de connexion,
            panier de réservation, préférence de langue, mémorisation de vos choix de consentement,
            sécurité.
          </li>
          <li>
            <strong>Mesure d’audience (consentement)</strong> : Matomo, auto-hébergé par SailingLoc
            — aucune donnée transmise à des tiers, adresses IP anonymisées, cookies conservés 13
            mois.
          </li>
          <li>
            <strong>Publicité & réseaux sociaux, personnalisation (consentement)</strong> :
            finalités décrites dans le panneau de paramétrage.
          </li>
        </ul>
        <p>
          Vous pouvez modifier votre choix à tout moment :{' '}
          <button
            type="button"
            onClick={openPreferences}
            className="font-medium text-sky-700 hover:underline"
          >
            gérer mes cookies
          </button>{' '}
          (également accessible en bas de chaque page).
        </p>
      </LegalSection>

      <LegalSection title="6. Destinataires des données">
        <p>
          Les données sont traitées par l’équipe SailingLoc et ses sous-traitants techniques :
          hébergeur, prestataire de paiement (Stripe), service d’envoi d’emails. Le propriétaire et
          le locataire d’une même réservation accèdent aux informations nécessaires à la location
          (nom, messagerie). Aucune donnée n’est vendue à des tiers.
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité">
        <p>
          Mots de passe hachés (bcrypt), authentification par jetons à durée limitée avec révocation
          des sessions (notamment en cas de changement de mot de passe ou de détection de
          réutilisation d’un jeton), déconnexion automatique après inactivité, chiffrement des
          échanges (HTTPS en production), accès aux justificatifs restreint à l’équipe de
          vérification.
        </p>
      </LegalSection>

      <LegalSection title="8. Vos droits">
        <p>
          Conformément au RGPD, vous disposez des droits d’accès, de rectification, d’effacement, de
          portabilité, de limitation et d’opposition sur vos données. Vous pouvez les exercer depuis
          votre espace (rubrique « Mon compte ») ou en écrivant à{' '}
          <a href="mailto:dpo@sailingloc.fr" className="text-sky-700 hover:underline">
            dpo@sailingloc.fr
          </a>{' '}
          — réponse sous 30 jours.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation
          à la CNIL :{' '}
          <a
            href="https://www.cnil.fr/fr/plaintes"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 hover:underline"
          >
            cnil.fr/fr/plaintes
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Mise à jour de la politique">
        <p>
          La présente politique peut évoluer (nouvelles finalités, nouveaux partenaires). En cas de
          changement substantiel concernant les cookies, votre consentement sera redemandé via la
          bannière.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

export default ConfidentialitePage;
