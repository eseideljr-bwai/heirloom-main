import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveSpace, requireActiveSpaceId } from '../../../../../lib/server/auth';
import { getHome, getMemberProfile } from '../../../../../lib/server/queries';
import { ApiError } from '../../../../../lib/api';

export const dynamic = 'force-dynamic';

const UNSUPPORTED_NOTE =
  "NOT SCOPED\nAPI — a per-room publication breakdown: how many of this person's kinlooms are published to their Family Home versus onward to Family Spaces. Needs the publications join table (backend Workstream 4.2); `visibility` is a two-value enum today.\nUI — the row renders as soon as a count exists; no layout change needed.";

/**
 * Legacy Bank scope — what the Bank is grounded in, and how much of it
 * the viewer may actually read.
 *
 * The two headline figures and the bar are real. The per-room breakdown
 * is not: nothing records which container a kinloom is published to, so
 * those rows show a dash rather than an invented number. The one row
 * that *is* computable — what you can't read — is derived from the gap
 * between the author's total and what the profile returned.
 */
export default async function LegacyBankScopePage({ params }: { params: { memberId: string } }) {
  const familySpaceId = await requireActiveSpaceId();

  let data;
  try {
    data = await getMemberProfile(familySpaceId, params.memberId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [home, activeSpace] = await Promise.all([
    getHome(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);

  const { member, kinlooms, kinloomCount } = data;
  const firstName = member.name?.split(' ')[0] || 'them';
  const myMemberId = home?.userSummary?.member_id || activeSpace?.member_id || null;
  const isMe = myMemberId != null
    && String(myMemberId).toLowerCase() === String(member.member_id).toLowerCase();

  const total = kinloomCount;
  const seen = isMe ? kinloomCount : kinlooms.length;
  const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
  const hidden = Math.max(total - seen, 0);
  const homeName = activeSpace?.name?.trim() || 'your Family Home';

  const rows: { label: string; note: string; value: number | null }[] = [
    {
      label: 'Published to Family Spaces you are in',
      note: 'Where your home is connected',
      value: null,
    },
    {
      label: `Published to ${homeName}`,
      note: isMe ? 'Your own Family Home' : 'The Family Home you share',
      value: null,
    },
    {
      label: isMe ? 'Private to you' : 'Not published to you',
      note: isMe ? 'Nobody else can read these' : 'Written, but not where you can read it',
      // Viewing someone else, this is simply what their total exceeds what
      // came back — real, and the one row we can stand behind today. On your
      // own scope it means "published nowhere", which needs the publications
      // table: showing 0 there would claim everything is published.
      value: isMe ? null : hidden,
    },
  ];

  return (
    <div className="scope-page">
      <Link href={`/portrait/${member.member_id}`} className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {member.name}
      </Link>

      <p className="eyebrow">Legacy Bank scope</p>
      <h1 className="scope-page__title">
        {isMe ? 'One vault. Everything you wrote.' : `One vault. What you can read of it.`}
      </h1>
      <p className="scope-page__lead">
        {isMe
          ? 'Everything you have written lives in one place. Publishing points an audience at part of it; the rest stays yours.'
          : `Everything ${firstName} has written lives in one place. You see the part they published where you can read it — never a separate, partial record.`}
      </p>

      <p className="scope-page__cta-row">
        <Link href={`/legacy-bank/${member.member_id}`} className="scope-page__cta">
          {isMe ? 'Open My Legacy Bank →' : `Open ${firstName}’s Legacy Bank →`}
        </Link>
      </p>

      <div className="scope-card">
        <div className="scope-card__heads">
          <div>
            <p className="scope-card__big">{total}</p>
            <p className="scope-card__label">
              kinlooms in {isMe ? 'your' : `${firstName}’s`} vault
            </p>
          </div>
          <div className="scope-card__head--right">
            <p className="scope-card__big scope-card__big--sm">{seen}</p>
            <p className="scope-card__label">{isMe ? 'you wrote them all' : 'you can read'}</p>
          </div>
        </div>

        <div
          className="scope-bar"
          role="img"
          aria-label={`${seen} of ${total} readable`}
        >
          <span className="scope-bar__fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="scope-rows">
          {rows.map(r => (
            <div
              key={r.label}
              className={`scope-row${r.value === null ? ' no-api' : ''}`}
              {...(r.value === null
                ? { 'data-api-scope': 'out', 'data-api-note': UNSUPPORTED_NOTE }
                : {})}
            >
              <span className="scope-row__label">{r.label}</span>
              <span className="scope-row__note">{r.note}</span>
              <span className="scope-row__v">{r.value === null ? '—' : r.value}</span>
            </div>
          ))}
        </div>

        <p className="scope-card__foot">
          One vault, one complete record. Nobody sees a partial
          {isMe ? ' you' : ` ${firstName}`} — they see what
          {isMe ? ' you' : ' they'} chose to publish.
        </p>
      </div>
    </div>
  );
}
