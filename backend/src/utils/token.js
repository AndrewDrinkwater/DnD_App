import crypto from 'node:crypto';
import { cfg } from '../config/env.js';

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const base64UrlDecode = (input) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = normalized + (padding ? '='.repeat(4 - padding) : '');
  return Buffer.from(padded, 'base64');
};

const createSignature = (header, payload, secret) =>
  base64UrlEncode(crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest());

const parseExpiresIn = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const fallback = 3600; // 1 hour
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const match = value.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) {
    return fallback;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };

  return amount * (multipliers[unit] || 1);
};

export const generateToken = (subject) => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const expiresInSeconds = parseExpiresIn(cfg.jwtExpiresIn);
  const payloadBody = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const payload = base64UrlEncode(JSON.stringify(payloadBody));
  const signature = createSignature(header, payload, cfg.jwtSecret);
  return `${header}.${payload}.${signature}`;
};

export const verifyToken = (token) => {
  if (typeof token !== 'string') {
    throw new Error('Invalid token');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [headerPart, payloadPart, signature] = parts;
  const expectedSignature = createSignature(headerPart, payloadPart, cfg.jwtSecret);

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error('Invalid token');
  }

  const payloadJson = base64UrlDecode(payloadPart).toString('utf8');
  const payload = JSON.parse(payloadJson);

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
};
