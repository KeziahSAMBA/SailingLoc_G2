// Correspondance département → région (découpage administratif 2016).
// Permet de déduire la région d'un port à partir du code INSEE de sa commune.
const DEPT_TO_REGION = {
  'Auvergne-Rhône-Alpes': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  'Bourgogne-Franche-Comté': ['21', '25', '39', '58', '70', '71', '89', '90'],
  Bretagne: ['22', '29', '35', '56'],
  'Centre-Val de Loire': ['18', '28', '36', '37', '41', '45'],
  Corse: ['2A', '2B'],
  'Grand Est': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  'Hauts-de-France': ['02', '59', '60', '62', '80'],
  'Île-de-France': ['75', '77', '78', '91', '92', '93', '94', '95'],
  Normandie: ['14', '27', '50', '61', '76'],
  'Nouvelle-Aquitaine': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  Occitanie: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  'Pays de la Loire': ['44', '49', '53', '72', '85'],
  "Provence-Alpes-Côte d'Azur": ['04', '05', '06', '13', '83', '84'],
  Guadeloupe: ['971'],
  Martinique: ['972'],
  Guyane: ['973'],
  'La Réunion': ['974'],
  Mayotte: ['976'],
};

const REGION_BY_DEPT = Object.entries(DEPT_TO_REGION).reduce((acc, [region, depts]) => {
  for (const d of depts) acc[d] = region;
  return acc;
}, {});

export const REGIONS = Object.keys(DEPT_TO_REGION);

// Extrait le code département depuis un code commune INSEE.
// Métropole : 2 premiers caractères (Corse = "2A"/"2B"). Outre-mer : 3 (préfixe "97").
export function departmentFromInsee(insee) {
  if (!insee) return null;
  const code = String(insee).trim().toUpperCase();
  if (code.startsWith('2A') || code.startsWith('2B')) return code.slice(0, 2);
  if (code.startsWith('97') || code.startsWith('98')) return code.slice(0, 3);
  return code.slice(0, 2);
}

export function regionFromDepartment(dept) {
  return dept ? REGION_BY_DEPT[dept] || null : null;
}

export function regionFromInsee(insee) {
  return regionFromDepartment(departmentFromInsee(insee));
}
