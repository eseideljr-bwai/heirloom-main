import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import { suggestedQuestions } from '../../../../lib/legacy-bank';
import { getHome, getMemberProfile } from '../../../../lib/server/queries';
import { ApiError } from '../../../../lib/api';
import LegacyChatThread from '../LegacyChatThread';

export const dynamic = 'force-dynamic';

/** How many corpus chips to name before collapsing the rest into a count. */
const REFS_SHOWN = 8;

export default async function LegacyBankChatPage({ params }: { params: { memberId: string } }) {
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

  const refs = kinlooms.slice(0, REFS_SHOWN);
  const refsMore = kinlooms.length - refs.length;

  return (
    <div className="lb-page2">
      <Link href={`/portrait/${member.member_id}`} className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {isMe ? 'My Legacy Portrait' : `${member.name}’s Legacy Portrait`}
      </Link>

      <div className="lb-head">
        <span
          className="lb-head__avatar"
          style={{ background: `${member.tone || '#a39376'}28`, color: member.tone || '#556b5b' }}
          aria-hidden="true"
        >
          {member.initials || member.name?.charAt(0) || '?'}
        </span>
        <div className="lb-head__text">
          <p className="eyebrow">AI Legacy Bank</p>
          <h1 className="lb-head__title">
            {isMe ? 'Your own record' : `${member.name}’s Legacy`}
          </h1>
        </div>
      </div>

      <p className="lb-lead">
        {isMe
          ? 'Answers come only from the kinlooms you created. No invented facts. No impersonation.'
          : `Answers come only from what ${firstName} chose to keep. Nothing is inferred, and nothing speaks in ${firstName}’s voice.`}
      </p>

      {refs.length > 0 && (
        <div className="lb-refs">
          <span className="lb-refs__label">Responding from:</span>
          {refs.map(k => (
            <Link
              key={k.ulid}
              href={`/library/${k.ulid}`}
              className="lb-ref"
              title={k.type_label ? `${k.type_label} · ${k.title}` : k.title}
            >
              {k.title || 'Untitled'}
            </Link>
          ))}
          {refsMore > 0 && (
            <Link href={`/portrait/${member.member_id}`} className="lb-refs__more">
              +{refsMore} more →
            </Link>
          )}
        </div>
      )}

      <div className="lb-grid">
        <LegacyChatThread
          familySpaceId={familySpaceId}
          conversationId={null}
          mode={member.deceased ? 'sealed' : 'living'}
          subjectMemberId={member.member_id}
          subjectDisplayName={firstName}
          suggestedQuestions={suggestedQuestions(member, kinlooms)}
        />

        <aside className="lb-ground">
          <p className="lb-ground__label">What it is grounded in</p>
          <p className="lb-ground__count">
            {kinloomCount} kinloom{kinloomCount === 1 ? '' : 's'}
          </p>
          <p
            className="lb-ground__sub no-api"
            data-api-scope="in"
            data-api-note={"GET /people/{personId}/legacy-bank/scope → LegacyBankScope\n→ kinlooms · integer, the whole grounding set\n→ rows[] · { kind: home | spaces | vault | space, label, kinlooms }\n→ enabled · false when this person has switched their Bank off — hide the panel\nThe chat itself: POST /legacy-bank/conversations with { subject_member_id } for a person, then POST .../{id}/ask with { question }. `mode: living|sealed` is gone."}
          >
            {isMe
              ? 'Everything in your vault, including what nobody else can read.'
              : `Only the kinlooms ${firstName} published where you can read them.`}
          </p>

          {kinlooms.length > 0 && (
            <div className="lb-ground__list">
              {kinlooms.slice(0, 6).map(k => (
                <Link key={k.ulid} href={`/library/${k.ulid}`} className="lb-ground__item">
                  <span className="lb-ground__type">{k.type_label}</span>
                  <span className="lb-ground__title">{k.title || 'Untitled'}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="lb-ground__links">
            <Link href={`/legacy-bank/${member.member_id}/scope`}>
              {isMe ? 'See your own scope →' : `See what you can read →`}
            </Link>
            <Link href={`/portrait/${member.member_id}`}>
              {isMe ? 'My Legacy Portrait →' : `${firstName}’s Legacy Portrait →`}
            </Link>
            {isMe && <Link href="/vault">Everything in My Vault →</Link>}
          </div>
        </aside>
      </div>
    </div>
  );
}
