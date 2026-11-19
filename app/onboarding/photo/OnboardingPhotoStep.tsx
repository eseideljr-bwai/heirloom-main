'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { components } from '../../../lib/api-schema/typed';
import PortraitFace from '../../(app)/portrait/PortraitFace';
import PortraitPhoto from '../../(app)/portrait/PortraitPhoto';

type Person = components['schemas']['PersonCard'];

/**
 * Add a profile image: the same upload My Portrait uses (`PUT /me/avatar`
 * through `PortraitPhoto`), so the nav avatar follows straight away.
 */
export default function OnboardingPhotoStep({ person, avatarUrl }: { person: Person; avatarUrl: string | null }) {
  // The photo is optional: Continue once there is one, "Skip for now" otherwise.
  const [hasPhoto, setHasPhoto] = useState(!!avatarUrl);

  return (
    <div style={{ maxWidth: 600, margin: '64px auto', padding: '0 32px' }}>
      <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 16px' }}>
        Your photo
      </p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.15, margin: '0 0 8px', color: '#1a1a1a' }}>
        Add a profile image.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: '0 0 40px' }}>
        A face helps your family know it&apos;s you. You can change it anytime from your Portrait.
      </p>

      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ width: '100%', maxWidth: 240, margin: '0 auto' }}>
          <PortraitPhoto name={person.name} avatarUrl={avatarUrl} editable onPhotoChange={url => setHasPhoto(!!url)}>
            <PortraitFace member={person} />
          </PortraitPhoto>
        </div>

        {hasPhoto ? (
          <Link
            href="/home"
            style={{ display: 'block', textAlign: 'center', background: '#556b5b', color: '#fdfcfa', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
          >
            Continue
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="btn-disabled-soft"
            style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'not-allowed' }}
          >
            Continue
          </button>
        )}
      </div>

      {!hasPhoto && (
        <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.45)', margin: '16px 0 0', textAlign: 'center' }}>
          <Link href="/home" style={{ color: 'rgba(26,26,26,0.45)', textDecoration: 'none' }}>Skip for now →</Link>
        </p>
      )}
    </div>
  );
}
