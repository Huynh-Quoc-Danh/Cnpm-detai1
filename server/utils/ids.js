import crypto from 'node:crypto';

const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomAlnum(len) {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALNUM[bytes[i] % ALNUM.length];
  return s;
}

export const newOrderId = () => 'HL' + randomAlnum(8);
export const newToken = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
