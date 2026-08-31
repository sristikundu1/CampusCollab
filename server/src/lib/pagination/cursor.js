import { createHmac, timingSafeEqual } from 'node:crypto';
import { RequestValidationError } from '../../errors/application-error.js';

function invalidCursor() {
  return new RequestValidationError([{ location: 'query', path: 'cursor', code: 'invalid_cursor', message: 'The pagination cursor is invalid or does not match these filters.' }]);
}

export function createCursorCodec(secret) {
  const sign = (payload) => createHmac('sha256', secret).update(payload).digest('base64url');
  return {
    encode(value) {
      const payload = Buffer.from(JSON.stringify({ v: 1, ...value })).toString('base64url');
      return `${payload}.${sign(payload)}`;
    },
    decode(cursor, expectedScope) {
      if (!cursor) return null;
      try {
        const [payload, signature, extra] = cursor.split('.');
        if (!payload || !signature || extra) throw new Error('Malformed cursor');
        const expected = sign(payload);
        if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid signature');
        const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (value.v !== 1 || value.scope !== expectedScope || !/^[a-f\d]{24}$/i.test(value.id) || Number.isNaN(Date.parse(value.at))) throw new Error('Invalid payload');
        return value;
      } catch {
        throw invalidCursor();
      }
    },
  };
}
