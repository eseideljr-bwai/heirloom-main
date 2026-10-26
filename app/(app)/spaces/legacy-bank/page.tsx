import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { getActiveFamilySpaceId, requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import LegacyChatThread from '../../legacy-bank/LegacyChatThread';

export const dynamic = 'force-dynamic';

/**
 * A Family Space's Legacy Bank: one question across everything published
 * into the Space. `?space=` picks one (from the Legacy Bank picker);
 * otherwise it is the Space being looked at.
 */
export default async function FamilyLegacyBankPage({ searchParams }: { searchParams: { space?: string } }) {
  await requireHome();
  const spaceId = searchParams.space || (await getActiveFamilySpaceId());

  if (!spaceId) {
    return (
      <div className="fb-page">
        <p className="eyebrow">Family Legacy Bank</p>
        <h1 className="fb-page__title">No Family Space yet.</h1>
        <p className="fb-page__lead">
          A Family Space’s Legacy Bank answers from what Homes publish into it. Your Home isn’t in one yet.
        </p>
        <Link href="/legacy-bank/me" className="fb-ground__cta">Open My Legacy Bank →</Link>
      </div>
    );
  }

  const scope = await serverKinloomApi
    .get('/family-spaces/{familySpace}/legacy-bank/scope', { path: { familySpace: spaceId } })
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    });

  const spaceName = scope.space?.name?.trim() || 'this Family Space';
  const total = scope.kinlooms;
  const suggestions = [
    'What does this family believe about hard years?',
    'Which traditions have lasted longest?',
    'Who here is remembered for their cooking?',
  ];

  return (
    <div className="fb-page">
      <p className="eyebrow">Family Legacy Bank</p>
      <h1 className="fb-page__title">Ask about {spaceName}.</h1>
      <p className="fb-page__lead">
        One question, every kinloom published into this Family Space. No invented facts.
        No impersonation. Just deeper access to what its Homes chose to share.
      </p>

      <div className="fb-grid">
        {scope.enabled ? (
          <LegacyChatThread
            target={{ scope: 'space', spaceId }}
            conversationId={null}
            subjectName={spaceName}
            isSpace
            voice={scope.voice}
            suggestedQuestions={total > 0 ? suggestions : undefined}
            placeholder="Ask about a person, a year, a tradition"
            intro={
              total > 0
                ? `Ask anything about ${spaceName}. Answers come only from the ${total} kinloom${total === 1 ? '' : 's'} published here, never from a Home’s private pages and never from another Family Space.`
                : `Nothing has been published into ${spaceName} that you can read yet, so there is nothing to draw on.`
            }
          />
        ) : (
          <div className="lb-chat">
            <div className="lb-chat__empty">
              <p className="lb-chat__empty-title">The Legacy Bank is off for this Space.</p>
              <p className="lb-chat__empty-sub">It can’t answer questions here right now.</p>
            </div>
          </div>
        )}

        <aside className="lb-ground fb-ground">
          <p className="lb-ground__label">What it is grounded in</p>
          <p className="lb-ground__count">
            {total} kinloom{total === 1 ? '' : 's'}
          </p>
          <p className="lb-ground__sub">
            Published to {spaceName} and readable by you. Nothing from a Home’s private
            pages, nothing from another Space.
          </p>

          {scope.rows.length > 0 && (
            <div className="lb-ground__list">
              {scope.rows.map(r => (
                <div key={r.kind} className="lb-ground__item">
                  <span className="lb-ground__type">{r.kinlooms}</span>
                  <span className="lb-ground__title">{r.label}</span>
                </div>
              ))}
            </div>
          )}

          <p className="fb-ground__note">
            Each person’s own Legacy Bank lives on their Legacy Portrait, grounded
            in their whole vault. This one only reads what was published here.
          </p>

          <Link href="/legacy-bank/me" className="fb-ground__cta">Open My Legacy Bank →</Link>
        </aside>
      </div>
    </div>
  );
}
