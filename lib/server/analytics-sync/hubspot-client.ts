/**
 * HubSpot CRM + Communication Preferences over HTTPS, server-only.
 *
 * Env (server-only secrets; never NEXT_PUBLIC_):
 *   HUBSPOT_SYNC_ENABLED            "1" to write. Anything else: the sync route does nothing.
 *   HUBSPOT_PRIVATE_APP_TOKEN       Private app token (crm.objects.contacts.read/write,
 *                                   communication_preferences.read_write).
 *   HUBSPOT_SUBSCRIPTION_ID         Email subscription type to opt sign-up members into.
 *   HUBSPOT_LEGAL_BASIS_ENABLED     "1" only once the account's data-privacy settings
 *                                   accept a legal basis. Without it (or without the
 *                                   subscription id) the opt-in is recorded as a
 *                                   property only.
 *
 * Logs never include emails, tokens or response bodies — status codes only.
 */

import 'server-only';
import { HubSpotConflictError, type Contact, type ContactProps, type HubSpotClient } from './core';

const BASE = 'https://api.hubapi.com';
const TIMEOUT_MS = 8000;

export function hubspotSyncEnabled(): boolean {
  return process.env.HUBSPOT_SYNC_ENABLED === '1' && !!process.env.HUBSPOT_PRIVATE_APP_TOKEN;
}

export function hubspotSubscriptionEnabled(): boolean {
  return !!process.env.HUBSPOT_SUBSCRIPTION_ID && process.env.HUBSPOT_LEGAL_BASIS_ENABLED === '1';
}

export class HubSpotHttpError extends Error {
  constructor(readonly status: number, readonly op: string) {
    super(`hubspot_${op}_${status}`);
  }
}

async function call(op: string, path: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new HubSpotHttpError(0, `${op}_no_token`);
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export function createHubSpotClient(): HubSpotClient {
  return {
    async getContactByEmail(email, properties): Promise<Contact | null> {
      const qs = new URLSearchParams({ idProperty: 'email', properties: properties.join(',') });
      const res = await call('get', `/crm/v3/objects/contacts/${encodeURIComponent(email)}?${qs}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new HubSpotHttpError(res.status, 'get');
      const body = (await res.json()) as { id: string; properties: Contact['properties'] };
      return { id: body.id, properties: body.properties ?? {} };
    },

    async createContact(properties: ContactProps) {
      const res = await call('create', '/crm/v3/objects/contacts', {
        method: 'POST',
        body: JSON.stringify({ properties }),
      });
      if (res.status === 409) throw new HubSpotConflictError();
      if (!res.ok) throw new HubSpotHttpError(res.status, 'create');
      const body = (await res.json()) as { id: string };
      return { id: body.id };
    },

    async updateContact(id: string, properties: ContactProps) {
      const res = await call('update', `/crm/v3/objects/contacts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) throw new HubSpotHttpError(res.status, 'update');
    },

    async subscribeWithConsent(email: string) {
      const res = await call('subscribe', '/communication-preferences/v3/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          emailAddress: email,
          subscriptionId: process.env.HUBSPOT_SUBSCRIPTION_ID,
          legalBasis: 'CONSENT_WITH_NOTICE',
          legalBasisExplanation: 'Opted in via checkbox at Kinloom sign-up',
        }),
      });
      // 400 "already subscribed" is a success for our purposes.
      if (!res.ok && res.status !== 400) throw new HubSpotHttpError(res.status, 'subscribe');
      if (res.status === 400) {
        const text = await res.text().catch(() => '');
        if (!/already subscribed/i.test(text)) throw new HubSpotHttpError(400, 'subscribe');
      }
    },
  };
}
