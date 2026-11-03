import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '../../../../../lib/api';
import { requireHome } from '../../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../../lib/server/kinloom-api';

export const dynamic = 'force-dynamic';

/**
 * Legacy Bank scope: what this person's bank would answer *you* from.
 * Every number is the API's, counted from what you can read. Nobody else's
 * total is ever shown, so there is no "of N" to compare against.
 */
export default async function LegacyBankScopePage({ params }: { params: { memberId: string } }) {
  await requireHome();

  const scope = await serverKinloomApi
    .get('/people/{member}/legacy-bank/scope', { path: { member: params.memberId } })
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    });

  const subject = scope.subject;
  if (!subject) notFound();
  const isMe = subject.is_you;
  const firstName = subject.name.split(' ')[0] || 'them';

  return (
    <div className="scope-page">
      <Link href={`/portrait/${subject.id}`} className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {isMe ? 'You' : subject.name}
      </Link>

      <p className="eyebrow">Legacy Bank scope</p>
      <h1 className="scope-page__title">
        {isMe ? 'One vault. Everything you wrote.' : 'One vault. What you can read of it.'}
      </h1>
      <p className="scope-page__lead">
        {isMe
          ? 'Everything you have written lives in one place. Publishing points an audience at part of it; the rest stays yours.'
          : `Everything ${firstName} has written lives in one place. You see the part they published where you can read it, never a separate, partial record.`}
      </p>

      {scope.enabled ? (
        <p className="scope-page__cta-row">
          <Link href={`/legacy-bank/${subject.id}`} className="scope-page__cta">
            {isMe ? 'Open My Legacy Bank →' : `Open ${firstName}’s Legacy Bank →`}
          </Link>
        </p>
      ) : (
        <p className="scope-page__lead">
          {firstName} has switched their Legacy Bank off, so it can’t answer questions about them right now.
        </p>
      )}

      <div className="scope-card">
        <div className="scope-card__heads">
          <div>
            <p className="scope-card__big">{scope.kinlooms}</p>
            <p className="scope-card__label">
              {isMe ? 'kinlooms your bank reads' : `of ${firstName}’s kinlooms you can read`}
            </p>
          </div>
        </div>

        <div className="scope-rows">
          {scope.rows.length === 0 ? (
            <div className="scope-row">
              <span className="scope-row__label">Nothing to read yet</span>
              <span className="scope-row__note">
                {isMe ? 'Write a kinloom and it will count here' : 'Nothing of theirs is published where you can read it'}
              </span>
              <span className="scope-row__v">0</span>
            </div>
          ) : (
            scope.rows.map(r => (
              <div key={r.kind} className="scope-row">
                <span className="scope-row__label">{r.label}</span>
                <span className="scope-row__note">
                  {r.kind === 'vault' ? 'Nobody else can read these' : r.kind === 'home' ? 'Your Family Home' : 'Family Spaces you share'}
                </span>
                <span className="scope-row__v">{r.kinlooms}</span>
              </div>
            ))
          )}
        </div>

        <p className="scope-card__foot">
          One vault, one complete record. Nobody sees a partial
          {isMe ? ' you' : ` ${firstName}`}; they see what
          {isMe ? ' you' : ' they'} chose to publish.
        </p>
      </div>
    </div>
  );
}
