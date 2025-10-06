import crypto from 'node:crypto';

const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

const pbkdf2Async = (password, salt, iterations, keyLength) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH);
  return `${ITERATIONS}:${KEY_LENGTH}:${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password, storedHash) => {
  if (!storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 4) return false;

  const [iterStr, keyLenStr, salt, storedKeyHex] = parts;
  const iterations = Number.parseInt(iterStr, 10);
  const keyLength = Number.parseInt(keyLenStr, 10);

  if (!iterations || !keyLength || !salt || !storedKeyHex) return false;

  try {
    const derivedKey = await pbkdf2Async(password, salt, iterations, keyLength);
    const storedKey = Buffer.from(storedKeyHex, 'hex');
    if (storedKey.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(storedKey, derivedKey);
  } catch (error) {
    return false;
  }
};
