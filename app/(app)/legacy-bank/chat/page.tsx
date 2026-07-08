import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getLegacyBank } from '../../../../lib/server/queries';

export const dynamic = 'force-dynamic';

/**
 * "Try a conversation" entry point. Per-member chat lives at
 * /legacy-bank/[memberId] — pick a subject here, then dive in. The
 * free-form whole-corpus mode is intentionally not part of Epic 3
 * (it was a mock-only prototype).
 */
export default async function LegacyBankTryPage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const { subjects, conversations } = await getLegacyBank(familySpaceId);

  return (
    <div className="lb-chat-try">
      <div className="lb-chat-try__back">
        <Link href="/legacy-bank" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back to vault
        </Link>
      </div>

      <p className="eyebrow lb-chat-try__eyebrow">Try a conversation</p>
      <h1 className="lb-chat-try__title">Whose legacy would you like to ask?</h1>
      <p className="lb-chat-try__lede">
        Conversations are grounded only in what each person chose to keep. Pick a family member to begin.
      </p>

      {subjects.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">No one has deposited kinlooms yet.</p>
          <p className="empty-card__sub">Add a few stories, letters, or voice memories first.</p>
          <Link href="/create" className="btn-primary btn-primary--lg">Create a kinloom</Link>
        </div>
      ) : (
        <div className="lb-subject-grid">
          {subjects.map(s => (
            <Link key={s.member_id} href={`/legacy-bank/${s.member_id}`} className="lb-subject-card">
              <span className="lb-subject-card__avatar" style={{ background: (s.tone || '#a39376') + '28', color: s.tone || '#556b5b' }}>
                {s.initials || s.name?.charAt(0) || '?'}
              </span>
              <div>
                <p className="lb-subject-card__name">{s.name}</p>
                <p className="lb-subject-card__role">
                  {s.role_label || s.kin_term || ''}
                  {s.deceased ? ' · Passed' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {conversations.length > 0 && (
        <div className="lb-chat-try__section">
          <p className="eyebrow">Continue where you left off</p>
          <ul className="lb-convo-list">
            {conversations.map(c => (
              <li key={c.ulid}>
                <Link href={`/legacy-bank/history/${c.ulid}`} className="lb-convo-row">
                  <span className="lb-convo-row__subject">{c.subject_name}</span>
                  {c.last_message_at && <span className="lb-convo-row__when">{c.last_message_at}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
