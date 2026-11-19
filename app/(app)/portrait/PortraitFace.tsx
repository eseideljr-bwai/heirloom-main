import type { components } from '../../../lib/api-schema/typed';

type Person = components['schemas']['PersonCard'];

/** The silhouette a portrait shows until the person has a photo. */
export default function PortraitFace({ member }: { member: Pick<Person, 'name' | 'gender' | 'tone'> }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  return (
    <svg viewBox="0 0 80 100" className="portrait__face" aria-label={member.name}>
      <defs><clipPath id="clip-portrait"><rect width="80" height="100" rx="5" /></clipPath></defs>
      <g clipPath="url(#clip-portrait)">
        <rect width="80" height="100" fill={`${tone}22`} />
        <rect y="62" width="80" height="38" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="44" rx="17" ry="19" fill={tone} opacity="0.38" />}
        <path d="M 4 100 C 4 76, 20 66, 40 66 C 60 66, 76 76, 76 100 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="42" rx="13" ry={gender === 'f' ? 12 : 11} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 27 38 Q 40 25, 53 38 L 53 42 Q 40 35, 27 42 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 27 40 Q 27 27, 40 25 Q 53 27, 53 40 L 53 49 Q 51 40, 40 40 Q 29 40, 27 49 Z" fill={tone} opacity="0.45" />}
      </g>
    </svg>
  );
}
