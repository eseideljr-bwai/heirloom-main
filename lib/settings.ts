/**
 * Account settings (contract §3.3, §6.10): the flat `/me/settings` object,
 * the profile form, and the legacy contact.
 *
 * Every write answers with the whole resource as it is after the change, so
 * screens replace their state with the response instead of patching it.
 */

import { kinloomApi } from './kinloom-api';
import { ApiError } from './api';
import type { components } from './api-schema/typed';

type Schemas = components['schemas'];

export type Settings = Schemas['Settings'];
export type SettingsChanges = Schemas['SettingsChanges'];
export type Profile = Schemas['Profile'];
export type ProfileChanges = Schemas['ProfileChanges'];
export type Me = Schemas['Me'];
export type MeLegacyContact = Schemas['MeLegacyContact'];
export type MeLegacyContactFor = Schemas['MeLegacyContactFor'];

/** PATCH /me/settings: any subset; answers with all nine keys. */
export function patchSettings(changes: SettingsChanges): Promise<Settings> {
  return kinloomApi.patch('/me/settings', { body: changes });
}

/** PATCH /me/profile: send only what changed. */
export function patchProfile(changes: ProfileChanges): Promise<Profile> {
  return kinloomApi.patch('/me/profile', { body: changes });
}

/** PUT /me/legacy-contact: name an address, or `null` to have none. Answers like GET /me. */
export function putLegacyContact(email: string | null): Promise<Me> {
  return kinloomApi.put('/me/legacy-contact', { body: { email } });
}

/** DELETE /me/legacy-contact-for/{member}: stop being someone's legacy contact. */
export function stopBeingLegacyContact(personId: string): Promise<Me> {
  return kinloomApi.delete('/me/legacy-contact-for/{member}', { path: { member: personId } });
}

/** The first thing worth showing from a failed write: the field's own message, else the API's. */
export function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      const wait = err.retryAfterSeconds;
      return wait && wait > 90
        ? `Too many changes. Try again in ${Math.ceil(wait / 60)} minutes.`
        : 'Too many changes in a row. Try again in a moment.';
    }
    return err.firstFieldError() ?? (err.message || fallback);
  }
  return fallback;
}
