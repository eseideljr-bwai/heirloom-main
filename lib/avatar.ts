/**
 * Avatars (contract §6.11): your own, and a family profile's in your Home.
 *
 * Three steps, like any upload: declare the file with `purpose: "avatar"`,
 * PUT the bytes (through the BFF proxy), then set it. Setting replaces and
 * deletes the previous avatar. The answer carries the new signed
 * `avatar_url`, so screens show it at once instead of waiting for a refetch.
 */

import { kinloomApi } from './kinloom-api';
import { uploadFileToSignedUrl } from './kinloom';
import type { components } from './api-schema/typed';

type Schemas = components['schemas'];

const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AvatarMime = (typeof AVATAR_MIME)[number];

/** The API's default avatar limit (`KINLOOM_MEDIA_MAX_BYTES_AVATAR`); it has the final word. */
const MAX_BYTES = 10 * 1024 * 1024;

/** For `<input type="file" accept>`. */
export const AVATAR_ACCEPT = AVATAR_MIME.join(',');

/** Why this file can't be an avatar, or null. Checked before anything is uploaded. */
export function avatarFileError(file: File): string | null {
  if (!(AVATAR_MIME as readonly string[]).includes(file.type)) {
    return 'Choose a JPEG, PNG, GIF or WebP image.';
  }
  if (file.size > MAX_BYTES) return 'That image is over 10 MB. Choose a smaller one.';
  return null;
}

async function uploadAvatar(file: File): Promise<string> {
  const { media_id, upload_url } = await kinloomApi.post('/media/upload-url', {
    body: {
      purpose: 'avatar',
      filename: file.name,
      mime_type: file.type as AvatarMime,
      file_size: file.size,
    },
  });
  await uploadFileToSignedUrl(upload_url, file);
  return media_id;
}

/** PUT /me/avatar. Answers like GET /me/profile. */
export async function setMyAvatar(file: File): Promise<Schemas['Profile']> {
  const media_id = await uploadAvatar(file);
  return kinloomApi.put('/me/avatar', { body: { media_id } });
}

/** DELETE /me/avatar. Your cards show your silhouette again. */
export function removeMyAvatar(): Promise<Schemas['Profile']> {
  return kinloomApi.delete('/me/avatar');
}

/** PUT …/members/{member}/avatar: a family profile only (`can_set_avatar`). */
export async function setMemberAvatar(homeId: string, memberId: string, file: File): Promise<Schemas['HomeMember']> {
  const media_id = await uploadAvatar(file);
  return kinloomApi.put('/family-homes/{familyHome}/members/{member}/avatar', {
    path: { familyHome: homeId, member: memberId },
    body: { media_id },
  });
}

/** DELETE …/members/{member}/avatar. */
export function removeMemberAvatar(homeId: string, memberId: string): Promise<Schemas['HomeMember']> {
  return kinloomApi.delete('/family-homes/{familyHome}/members/{member}/avatar', {
    path: { familyHome: homeId, member: memberId },
  });
}
