import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../lib/server/auth';
import { getFamilyOverview, type FamilyMember } from '../../../lib/server/queries';

export const dynamic = 'force-dynamic';

function Silhouette({ member, size = 44 }: { member: FamilyMember; size?: number }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  const isMe = !!member.is_me;
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} className="silhouette">
      <defs><clipPath id={`clip-fam-${member.member_id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-fam-${member.member_id})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
      {isMe && <circle cx="40" cy="40" r="38" fill="none" stroke="#556b5b" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.9" />}
    </svg>
  );
}

function memberSecondaryLine(m: FamilyMember): string {
  const role = m.role_label || m.kin_term || '';
  const passed = m.deceased ? ' · Passed' : '';
  const count = m.kinloom_count ?? 0;
  const counts = count > 0 ? `${count} kinloom${count !== 1 ? 's' : ''}` : 'No kinlooms yet';
  return [role, passed.replace(/^ · /, '') || null, counts].filter(Boolean).join(' · ');
}

export default async function FamilyPage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const { space, generations } = await getFamilyOverview(familySpaceId);

  return (
    <div className="family-page">

      <div className="family-page__header">
        <p className="eyebrow family-page__eyebrow">Family</p>
        <h1 className="family-page__title">{space.name || 'Your family space.'}</h1>
        <p className="family-page__intro">
          A private, invite-only space where your family&rsquo;s stories, voices, and legacy come together.
        </p>
      </div>

      <div className="family-roster">
        {generations.length === 0 && (
          <p className="family-roster__empty">No family members added yet.</p>
        )}
        {generations.map(g => (
          <div key={g.generation} className="family-gen">
            <p className="family-gen__label">{g.label}</p>
            <div className="family-gen__row">
              {g.members.map(m => (
                <Link
                  key={m.member_id}
                  href={`/family/${m.member_id}`}
                  className={`family-card${m.is_me ? ' is-me' : ''}`}
                >
                  <Silhouette member={m} size={44} />
                  <div>
                    <p className="family-card__name">{m.name}</p>
                    <p className="family-card__sub">{memberSecondaryLine(m)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="family-nav-grid">
        {[
          { href: '/family/feed',    label: 'Family kinlooms',  desc: 'See what your family has been creating.' },
          { href: '/family/tree',    label: 'Family tree',      desc: 'Visualize relationships across generations.' },
          { href: '/family/members', label: 'Manage members',   desc: "Invite and manage who's in your space." },
        ].map(s => (
          <Link key={s.href} href={s.href} className="family-nav-card">
            <h3 className="family-nav-card__title">{s.label}</h3>
            <p className="family-nav-card__desc">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="family-invite">
        <div>
          <h3 className="family-invite__title">Invite your family</h3>
          <p className="family-invite__sub">Your family space is invite-only. Bring in the people who matter.</p>
        </div>
        <Link href="/family/members" className="btn-primary">Manage members</Link>
      </div>

    </div>
  );
}
