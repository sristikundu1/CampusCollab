import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, { N: 16_384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, n, r, p, saltValue, hashValue] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, 'base64url');
  const derived = Buffer.from(await scrypt(password, Buffer.from(saltValue, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p) }));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

