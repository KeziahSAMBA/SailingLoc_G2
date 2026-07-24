import { describe, expect, it, jest } from '@jest/globals';
import {
  registerPositiveIdParams,
  validatePositiveIdParam,
} from '../src/middlewares/validateParamMiddleware.js';

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('numeric route parameter validation', () => {
  it.each(['1', '42', '2147483647'])('accepts database identifier %s', (value) => {
    const res = response();
    const next = jest.fn();

    validatePositiveIdParam({}, res, next, value);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    '0',
    '-1',
    '1.5',
    '01',
    'abc',
    '1 OR 1=1',
    '1; DROP TABLE user',
    '2147483648',
    '9007199254740992',
  ])('rejects malicious or invalid identifier %s', (value) => {
    const res = response();
    const next = jest.fn();

    validatePositiveIdParam({}, res, next, value);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Identifiant invalide.' });
  });

  it('registers every declared identifier on a router', () => {
    const router = { param: jest.fn() };

    registerPositiveIdParams(router, ['id', 'id_boat']);

    expect(router.param).toHaveBeenNthCalledWith(1, 'id', validatePositiveIdParam);
    expect(router.param).toHaveBeenNthCalledWith(2, 'id_boat', validatePositiveIdParam);
  });
});
