import { Hexagon } from '../sdk/typescript/index.js';
import { localPreviewRequest } from './local-preview-request.js';

/** Wall-clock expiry against the real preview proxy; never edits grant timestamps. */
export async function checkPreviewExpiry(client: Hexagon, session: string, port: number, expected: string) {
  const grant = await client.createPreview(session, 3000, 30);
  const url = new URL(grant.url);
  const ticket = () => localPreviewRequest(url, port, url.pathname + url.search);
  const entry = await ticket();
  const cookie = entry.headers.get('set-cookie')?.split(';')[0];
  if (entry.status !== 302 || !cookie) throw new Error('expiry_preview_entry_failed');
  const page = await localPreviewRequest(url, port, '/', cookie);
  if (page.status !== 200 || !(await page.text()).includes(expected)) throw new Error('expiry_preview_content_failed');
  const before = new Date().toISOString();
  const other = await client.createPreview(session, 3000, 120);
  const otherUrl = new URL(other.url);
  if ((await localPreviewRequest(otherUrl, port, '/', cookie)).status !== 401) throw new Error('preview_cookie_cross_grant');
  const otherEntry = await localPreviewRequest(otherUrl, port, otherUrl.pathname + otherUrl.search);
  const otherCookie = otherEntry.headers.get('set-cookie')?.split(';')[0];
  if (otherEntry.status !== 302 || !otherCookie) throw new Error('revocation_preview_entry_failed');
  await client.revokePreview(other.id);
  const revokedCookie = (await localPreviewRequest(otherUrl, port, '/', otherCookie)).status;
  const revokedTicket = (await localPreviewRequest(otherUrl, port, otherUrl.pathname + otherUrl.search)).status;
  if (revokedCookie !== 401 || revokedTicket !== 401) throw new Error('revoked_preview_accepted');
  const target = new Date(grant.expires_at).getTime() + 500;
  if (target - Date.now() > 31000) throw new Error('unexpected_preview_expiry');
  while (Date.now() < target) await new Promise(resolve => setTimeout(resolve, Math.min(1000, target - Date.now())));
  const expiredCookie = (await localPreviewRequest(url, port, '/', cookie)).status;
  const expiredTicket = (await ticket()).status;
  if (expiredCookie !== 401 || expiredTicket !== 401) throw new Error('expired_preview_accepted');
  return { id: grant.id, accessible_at: before, expires_at: grant.expires_at, checked_at: new Date().toISOString(), expired_cookie_status: expiredCookie, expired_ticket_status: expiredTicket, cross_grant_denied: true, revoked_cookie_status: revokedCookie, revoked_ticket_status: revokedTicket };
}
