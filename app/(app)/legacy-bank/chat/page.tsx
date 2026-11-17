import Link from 'next/link';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import { orNull } from '../../../../lib/server/safe';
import ConversationRow from '../ConversationRow';

export const dynamic = 'force-dynamic';

/**
 * "Try a conversation": choose whose bank to ask, or a Family Space's. The
 * list is the API's: you first, then the people whose bank is on and who have
 * at least one kinloom you can read, then each Space your Home is in.
 */
export default async function LegacyBankTryPage() {
  await requireHome();

  const [subjects, recent] = await Promise.all([
    orNull(serverKinloomApi.get('/legacy-bank')),
    orNull(serverKinloomApi.get('/legacy-bank/conversations', { query: { per_page: 5 } })),
  ]);
  const people = subjects?.people ?? [];
  const spaces = subjects?.spaces ?? [];
  const conversations = (recent?.data ?? []).filter(c => c.last_message_at);
  const others = people.filter(p => !p.is_you);

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
        Every answer comes only from what a person chose to keep, and that you can already read.
      </p>

      {people.length === 0 && spaces.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">There’s no one to ask yet.</p>
          <p className="empty-card__sub">Add a few stories, letters or voice memories first.</p>
          <Link href="/create" className="btn-primary btn-primary--lg">Create a kinloom</Link>
        </div>
      ) : (
        <>
          <div className="lb-subject-grid">
            {people.map(p => (
              <Link key={p.id} href={`/legacy-bank/${p.id}`} className="lb-subject-card">
                <span className="lb-subject-card__avatar" style={{ background: `${p.tone || '#a39376'}28`, color: p.tone || '#556b5b' }}>
                  {p.initials || p.name.charAt(0)}
                </span>
                <div>
                  <p className="lb-subject-card__name">{p.is_you ? 'You' : p.name}</p>
                  <p className="lb-subject-card__role">
                    {p.is_you ? 'Your own record' : p.label || ''}
                    {p.deceased ? ' · Passed' : ''}
                    {` · ${p.kinlooms} kinloom${p.kinlooms === 1 ? '' : 's'}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {others.length === 0 && (
            <p className="lb-chat-try__lede lb-chat-try__lede--quiet">
              Others appear here once they’ve published something you can read.
            </p>
          )}

          {spaces.length > 0 && (
            <div className="lb-chat-try__section">
              <p className="eyebrow">Across a Family Space</p>
              <div className="lb-subject-grid">
                {spaces.map(sp => (
                  <Link key={sp.id} href={`/spaces/legacy-bank?space=${encodeURIComponent(sp.id)}`} className="lb-subject-card">
                    <span className="lb-subject-card__avatar lb-subject-card__avatar--space" aria-hidden="true">
                      {sp.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="lb-subject-card__name">{sp.name}</p>
                      <p className="lb-subject-card__role">
                        {sp.kinlooms} kinloom{sp.kinlooms === 1 ? '' : 's'} published here
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {conversations.length > 0 && (
        <div className="lb-chat-try__section">
          <p className="eyebrow">Continue where you left off</p>
          <div className="lb-history-list">
            {conversations.map(c => (
              <ConversationRow key={c.id} conversation={c} href={`/legacy-bank/history/${c.id}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
