import { describe, expect, it, jest } from '@jest/globals';
import {
  fetchBoundedPublicPages,
  MAX_PUBLIC_ITEMS,
  MAX_PUBLIC_PAGES,
  PUBLIC_PAGE_SIZE,
} from '../../frontend/src/services/publicPagination.js';

describe('agrégation frontend des collections publiques bornées', () => {
  it('agrège plusieurs pages et conserve la forme de réponse Axios', async () => {
    const requestPage = jest.fn(({ page, pageSize }) =>
      Promise.resolve({
        status: 200,
        headers: { page },
        data: Array.from({ length: page === 1 ? pageSize : 2 }, (_, index) => ({
          id: (page - 1) * pageSize + index + 1,
        })),
      })
    );

    const response = await fetchBoundedPublicPages(requestPage);

    expect(requestPage).toHaveBeenCalledTimes(2);
    expect(requestPage).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: PUBLIC_PAGE_SIZE,
    });
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ page: 1 });
    expect(response.data).toHaveLength(PUBLIC_PAGE_SIZE + 2);
    expect(response.data.at(-1)).toEqual({ id: PUBLIC_PAGE_SIZE + 2 });
  });

  it('s’arrête immédiatement sur une page vide ou incomplète', async () => {
    const requestPage = jest
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: PUBLIC_PAGE_SIZE }, (_, id) => ({ id })),
      })
      .mockResolvedValueOnce({ data: [] });

    const response = await fetchBoundedPublicPages(requestPage);

    expect(response.data).toHaveLength(PUBLIC_PAGE_SIZE);
    expect(requestPage).toHaveBeenCalledTimes(2);
  });

  it('déduplique les lignes qui se chevauchent entre deux pages en gardant leur ordre', async () => {
    const requestPage = jest.fn(({ page, pageSize }) =>
      Promise.resolve({
        data:
          page === 1
            ? Array.from({ length: pageSize }, (_, index) => ({ id: index + 1 }))
            : page === 2
              ? Array.from({ length: pageSize }, (_, index) => ({ id: index + pageSize }))
              : [],
      })
    );

    const response = await fetchBoundedPublicPages(requestPage);

    expect(response.data.map(({ id }) => id)).toEqual(Array.from({ length: 49 }, (_, i) => i + 1));
    expect(requestPage).toHaveBeenCalledTimes(3);
  });

  it('s’arrête lorsqu’une page répétée ne fait plus progresser l’agrégat', async () => {
    const page = Array.from({ length: PUBLIC_PAGE_SIZE }, (_, id) => ({ id }));
    const requestPage = jest.fn().mockResolvedValue({ data: page });

    const response = await fetchBoundedPublicPages(requestPage);

    expect(response.data).toEqual(page);
    expect(requestPage).toHaveBeenCalledTimes(2);
  });

  it('reste borné même si le serveur répète des pages complètes', async () => {
    const requestPage = jest.fn(({ page, pageSize }) =>
      Promise.resolve({
        data: Array.from({ length: pageSize }, (_, index) => ({
          id: (page - 1) * pageSize + index,
        })),
      })
    );

    const response = await fetchBoundedPublicPages(requestPage);

    expect(requestPage).toHaveBeenCalledTimes(MAX_PUBLIC_PAGES);
    expect(response.data).toHaveLength(MAX_PUBLIC_ITEMS);
  });

  it('propage une erreur de page et n’essaie pas de page suivante', async () => {
    const failure = new Error('service indisponible');
    const requestPage = jest
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: PUBLIC_PAGE_SIZE }, (_, id) => ({ id })),
      })
      .mockRejectedValueOnce(failure);

    await expect(fetchBoundedPublicPages(requestPage)).rejects.toBe(failure);
    expect(requestPage).toHaveBeenCalledTimes(2);
  });

  it('refuse une réponse qui ne contient pas une collection', async () => {
    const requestPage = jest.fn().mockResolvedValue({ data: { items: [] } });

    await expect(fetchBoundedPublicPages(requestPage)).rejects.toThrow(
      /Réponse de collection publique invalide/
    );
    expect(requestPage).toHaveBeenCalledTimes(1);
  });
});
