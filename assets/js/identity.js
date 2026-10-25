// Izpeljava prijavnega e-naslova iz uporabniškega imena. MORA biti enaka functions/src/validation.js (usernameToEmail).
export const EMAIL_DOMAIN = 'thelasthour.example';
export const normUsername = (u) => String(u ?? '').normalize('NFKC').trim().toLowerCase();
export async function usernameToEmail(usernameKey) {
  const bytes = new TextEncoder().encode(usernameKey);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  return `d${hex}@${EMAIL_DOMAIN}`;
}
