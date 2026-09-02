// The API deliberately keeps public collection pages small to bound database
// work. Consumers that need the complete public catalogue/review set use this
// helper to collect pages while retaining an explicit client-side ceiling.
export const PUBLIC_PAGE_SIZE = 25;
export const MAX_PUBLIC_ITEMS = 500;
export const MAX_PUBLIC_PAGES = Math.ceil(MAX_PUBLIC_ITEMS / PUBLIC_PAGE_SIZE);

const defaultItemId = (item) => item?.id_boat ?? item?.id_review ?? item?.id ?? null;

function identityKey(value) {
  return `${typeof value}:${String(value)}`;
}

function pageSignature(items, getItemId) {
  return JSON.stringify(
    items.map((item) => {
      const id = getItemId(item);
      return id === null || id === undefined
        ? ['value', JSON.stringify(item)]
        : ['id', identityKey(id)];
    })
  );
}

/**
 * Collect a bounded array endpoint without trusting it to return every row.
 * The request callback receives a 1-based page and the fixed page size. The
 * first Axios response is retained so callers that historically returned an
 * Axios response keep the same external shape (`{ data: [...] }`).
 */
export async function fetchBoundedPublicPages(
  requestPage,
  { pageSize = PUBLIC_PAGE_SIZE, maxItems = MAX_PUBLIC_ITEMS, getItemId = defaultItemId } = {}
) {
  if (
    typeof requestPage !== 'function' ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    !Number.isSafeInteger(maxItems) ||
    maxItems < 1 ||
    typeof getItemId !== 'function'
  ) {
    throw new TypeError('Paramètres de pagination publique invalides.');
  }

  const maxPages = Math.ceil(maxItems / pageSize);
  let firstResponse = null;
  const items = [];
  const seenIds = new Set();
  const seenPages = new Set();

  for (let page = 1; page <= maxPages && items.length < maxItems; page += 1) {
    const response = await requestPage({ page, pageSize });
    if (!response || !Array.isArray(response.data)) {
      throw new TypeError('Réponse de collection publique invalide.');
    }
    if (!firstResponse) firstResponse = response;

    // Une API défaillante peut répéter une page complète sans jamais atteindre
    // une page courte. Arrêter sur une signature déjà vue évite de refaire ces
    // appels tout en conservant l'ordre reçu pour les lignes nouvelles.
    const signature = pageSignature(response.data, getItemId);
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    const previousLength = items.length;
    for (const item of response.data) {
      if (items.length >= maxItems) break;
      const id = getItemId(item);
      if (id !== null && id !== undefined) {
        const key = identityKey(id);
        if (seenIds.has(key)) continue;
        seenIds.add(key);
      }
      items.push(item);
    }

    // Une page non vide composée uniquement de doublons ne peut pas faire
    // progresser l'agrégat ; ne pas demander indéfiniment la page suivante.
    if (items.length === previousLength) break;

    // A short or empty page is the reliable end marker. The page-count and
    // maxItems guards above remain in force if a faulty server repeats full
    // pages forever or ignores pagination parameters.
    if (response.data.length < pageSize) break;
  }

  return { ...firstResponse, data: items };
}
