import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Mentions légales (art. 6-III de la loi n° 2004-575 « LCEN »).
// Entité fictive — projet pédagogique (voir l'avertissement du layout).
function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" updated="9 juillet 2026" updatedIso="2026-07-09">
      <LegalSection title="1. Éditeur du site">
        <p>
          Le site <strong>sailingloc.fr</strong> est édité par <strong>SailingLoc SAS</strong>,
          société par actions simplifiée au capital de 10 000 €, immatriculée au RCS de Marseille
          sous le numéro 000 000 000 (fictif).
        </p>
        <p>
          Siège social : 12 Quai du Port, 13002 Marseille, France
          <br />
          Téléphone : +33 (0)2 00 66 77 89
          <br />
          Email :{' '}
          <a href="mailto:contact@sailingloc.fr" className="text-sky-700 hover:underline">
            contact@sailingloc.fr
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Directeur de la publication">
        <p>Le directeur de la publication est le représentant légal de SailingLoc SAS.</p>
      </LegalSection>

      <LegalSection title="3. Hébergement">
        <p>
          Le site est hébergé par <strong>OVHcloud</strong> — 2 rue Kellermann, 59100 Roubaix,
          France —{' '}
          <span className="text-gray-400">
            (hébergeur indiqué à titre d’exemple pour ce projet pédagogique)
          </span>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          L’ensemble des éléments du site (structure, textes, logos, images, charte graphique, code)
          est la propriété de SailingLoc ou de ses partenaires. Toute reproduction, représentation
          ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite
          (articles L335-2 et suivants du Code de la propriété intellectuelle).
        </p>
        <p>
          Les photos des bateaux sont fournies par leurs propriétaires, qui garantissent en détenir
          les droits.
        </p>
      </LegalSection>

      <LegalSection title="5. Données personnelles & cookies">
        <p>
          Le traitement des données personnelles et l’usage des cookies sont détaillés dans la{' '}
          <a href="/politique-de-confidentialite" className="text-sky-700 hover:underline">
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Signalement d'un contenu">
        <p>
          Pour signaler un contenu illicite ou une erreur, utilisez la{' '}
          <a href="/contact" className="text-sky-700 hover:underline">
            page contact
          </a>{' '}
          ou écrivez à contact@sailingloc.fr. Nous accusons réception sous 48 h ouvrées.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

export default MentionsLegalesPage;
