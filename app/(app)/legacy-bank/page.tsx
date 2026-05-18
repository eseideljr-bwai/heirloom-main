import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../lib/server/auth';
import { getLegacyBank } from '../../../lib/server/queries';

export const dynamic = 'force-dynamic';

function VaultMark() {
  return (
    <svg viewBox="0 0 480 280" width="100%" className="vault-mark" aria-hidden="true">
      <defs>
        <radialGradient id="vaultCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8d4a8" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#c9a96e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c9a96e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vaultDepth" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3a3934" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#3a3934" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#3a3934" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="threadL" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a39376" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#556b5b" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="threadR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#556b5b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a39376" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <circle cx="240" cy="140" r="84" fill="url(#vaultDepth)">
        <animate attributeName="r" values="80;94;80" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="240" cy="140" r="56" fill="url(#vaultCore)">
        <animate attributeName="r" values="52;60;52" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="240" cy="140" r="3" fill="#c9a96e" opacity="0.9">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

const DEPOSIT_PROMPTS = [
  { id: 'voice',  kind: 'A voice memory',              invitation: 'Speak something you would want them to hear.' },
  { id: 'letter', kind: 'A written reflection',         invitation: 'Write a letter to someone not yet born.' },
  { id: 'photo',  kind: 'A photograph, with context',   invitation: 'Show them a moment that shaped you.' },
  { id: 'lesson', kind: 'A life lesson',                invitation: 'Pass on something you learned the hard way.' },
  { id: 'belief', kind: 'A belief, a value',            invitation: 'Tell them what you stand for, in your own words.' },
];

export default async function LegacyBankPage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const { progress, conversations, subjects } = await getLegacyBank(familySpaceId);
  const total = progress.total_kinlooms;
  const target = progress.target || 50;
  const pct = progress.percent != null
    ? Math.max(0, Math.min(100, Math.round(progress.percent)))
    : Math.min(100, Math.round((total / target) * 100));

  return (
    <div className="lb-page">
      <p className="eyebrow lb-page__eyebrow">AI Legacy Bank</p>
      <h1 className="lb-page__title">A vault for what words alone can&rsquo;t carry.</h1>
      <p className="lb-page__lede">
        One day, someone you love will want to know who you were &mdash; not what you did, but how you saw. The vault is empty, and waiting, and listening.
      </p>

      <div className="lb-progress">
        <div className="lb-progress__track"><div className="lb-progress__bar" style={{ width: `${pct}%` }} /></div>
        <p className="lb-progress__count"><strong>{total}</strong>{' of ~'}{target}{' kinlooms gathered'}</p>
      </div>

      <div className="lb-hero">
        <VaultMark />
      </div>

      {subjects.length > 0 && (
        <div className="lb-section">
          <p className="eyebrow">Ask a family member&rsquo;s legacy</p>
          <div className="lb-subject-grid">
            {subjects.map(s => (
              <Link key={s.member_id} href={`/legacy-bank/${s.member_id}`} className="lb-subject-card">
                <span className="lb-subject-card__avatar" style={{ background: (s.tone || '#a39376') + '28', color: s.tone || '#556b5b' }}>
                  {s.initials || s.name?.charAt(0) || '?'}
                </span>
                <div>
                  <p className="lb-subject-card__name">{s.name}</p>
                  <p className="lb-subject-card__role">{s.role_label || s.kin_term || ''}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {conversations.length > 0 && (
        <div className="lb-section">
          <p className="eyebrow">Continue a conversation</p>
          <ul className="lb-convo-list">
            {conversations.map(c => (
              <li key={c.ulid}>
                <Link href={`/legacy-bank/chat?conversation=${c.ulid}`} className="lb-convo-row">
                  <span className="lb-convo-row__subject">{c.subject_name}</span>
                  {c.last_message_at && <span className="lb-convo-row__when">{c.last_message_at}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lb-section">
        <div className="lb-section__head">
          <p className="eyebrow">The first deposit</p>
          <span className="lb-section__hint">Choose any one. There&rsquo;s no order, and no clock.</span>
        </div>
        <div className="lb-deposits">
          {DEPOSIT_PROMPTS.map((p, i) => (
            <Link key={p.id} href="/create" className={`lb-deposit${i === DEPOSIT_PROMPTS.length - 1 ? ' is-last' : ''}`}>
              <span className="lb-deposit__num">{String(i + 1).padStart(2, '0')}</span>
              <div className="lb-deposit__body">
                <h3 className="lb-deposit__title">{p.invitation}</h3>
                <p className="lb-deposit__kind">{p.kind}</p>
              </div>
              <span className="lb-deposit__cta">
                Begin
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="lb-cta">
        <Link href="/create" className="btn-primary btn-primary--lg">Begin the vault</Link>
        <Link href="/legacy-bank/chat" className="btn-outline btn-outline--lg">Try a conversation</Link>
      </div>
      <p className="lb-cta__note">You can leave at any time. Nothing is shared yet, and nothing will be without you.</p>
    </div>
  );
}
