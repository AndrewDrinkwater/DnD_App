import crypto from 'node:crypto';

const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
const PBKDF2_PARTS = 4;
const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$'];

let cachedSequelize = null;
let cachedQueryTypes = null;

const pbkdf2Async = (password, salt, iterations, keyLength) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });

const getSequelize = async () => {
  if (cachedSequelize) return cachedSequelize;
  const module = await import('../models/index.js');
  cachedSequelize = module.sequelize;
  return cachedSequelize;
};

const getQueryTypes = async () => {
  if (cachedQueryTypes) return cachedQueryTypes;
  const module = await import('sequelize');
  cachedQueryTypes = module.QueryTypes;
  return cachedQueryTypes;
};

const isPbkdf2Hash = (hash) => typeof hash === 'string' && hash.split(':').length === PBKDF2_PARTS;

const isBcryptHash = (hash) => typeof hash === 'string' && BCRYPT_PREFIXES.some((prefix) => hash.startsWith(prefix));

const verifyWithPbkdf2 = async (password, storedHash) => {
  const parts = storedHash.split(':');
  if (parts.length !== PBKDF2_PARTS) return false;

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

const verifyWithBcrypt = async (password, storedHash) => {
  try {
    const [sequelize, QueryTypes] = await Promise.all([getSequelize(), getQueryTypes()]);
    if (!sequelize || !QueryTypes) return false;
    const result = await sequelize.query(
      'SELECT crypt($1, $2) = $2 AS matches',
      {
        bind: [password, storedHash],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    return Boolean(result?.matches);
  } catch (error) {
    console.warn('Failed to verify bcrypt password hash via pgcrypto', error);
    return false;
  }
};

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH);
  return `${ITERATIONS}:${KEY_LENGTH}:${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password, storedHash) => {
  if (!storedHash) return false;

  if (isPbkdf2Hash(storedHash)) {
    return verifyWithPbkdf2(password, storedHash);
  }

  if (isBcryptHash(storedHash)) {
    return verifyWithBcrypt(password, storedHash);
  }

  // Legacy fallback for environments that stored passwords in plain text
  return storedHash === password;
};
