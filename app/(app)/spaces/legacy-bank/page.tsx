import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getLibraryServer, getManageMembers } from '../../../../lib/server/queries';
import LegacyChatThread from '../../legacy-bank/LegacyChatThread';
import { orNull } from '../../../../lib/server/safe';

export const dynamic = 'force-dynamic';

export default async function FamilyLegacyBankPage() {
  const familySpaceId = await requireActiveSpaceId();

  const [library, manage, activeSpace] = await Promise.all([
    orNull(getLibraryServer(familySpaceId)),
    getManageMembers(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);

  const kinlooms = library?.kinlooms ?? [];

  const spaceName = activeSpace?.name?.trim() || 'this Family Space';
  const members = manage?.members ?? [];
  const total = kinlooms.length;
  const hasVoices = kinlooms.some(k => k.has_audio);

  // The design groups the grounding list by Home. Homes don't exist, so it
  // is grouped by the person who wrote each piece instead.
  const byAuthor = members
    .map(m => ({
      member: m,
      count: kinlooms.filter(
        k => k.author?.member_id
          && String(k.author.member_id).toLowerCase() === String(m.member_id).toLowerCase(),
      ).length,
    }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const suggestions = [
    'What does this family believe about hard years?',
    'Which traditions have lasted longest?',
    ...(hasVoices ? ['Who has recorded their voice?'] : []),
  ];

  return (
    <div className="fb-page">
      <p className="eyebrow">Family Legacy Bank</p>
      <h1 className="fb-page__title">Ask about {spaceName}.</h1>
      <p className="fb-page__lead">
        One question, every kinloom this Family Space holds. No invented facts.
        No impersonation. Just deeper access to what the homes here chose to publish.
      </p>

      <div className="fb-grid">
        <LegacyChatThread
          familySpaceId={familySpaceId}
          conversationId={null}
          mode="living"
          // No subject: this conversation is grounded in the Space, not a person.
          subjectMemberId={null}
          subjectDisplayName={spaceName}
          suggestedQuestions={suggestions}
          placeholder="Ask about a person, a year, a tradition"
          intro={`Ask anything about ${spaceName}. Answers come only from the ${total} kinlooms its homes have published here — never from a home’s private pages, and never from another Family Space.`}
        />

        <aside className="lb-ground fb-ground">
          <p className="lb-ground__label">What it is grounded in</p>
          <p className="lb-ground__count">
            {total} kinloom{total === 1 ? '' : 's'}
          </p>
          <p
            className="lb-ground__sub no-api"
            data-api-scope="out"
            data-api-note={"NOT SCOPED\nAPI — the breakdown should be per Family Home (“by its 4 homes”, each row a Home with its published count). Homes don't exist as records, so this lists the people who wrote the pieces instead.\nUI — swap the grouping key from author to Home; the row shape is unchanged."}
          >
            Published to {spaceName} by its {members.length}{' '}
            {members.length === 1 ? 'member' : 'members'}. Nothing from a home’s
            private pages, nothing from another Space.
          </p>

          {byAuthor.length > 0 && (
            <div className="lb-ground__list">
              {byAuthor.map(({ member, count }) => (
                <Link key={member.member_id} href={`/portrait/${member.member_id}`} className="fb-src">
                  <span
                    className="fb-src__face"
                    style={{ background: `${member.tone || '#a39376'}28`, color: member.tone || '#556b5b' }}
                    aria-hidden="true"
                  >
                    {member.initials || member.name?.charAt(0) || '?'}
                  </span>
                  <span className="fb-src__name">{member.name}</span>
                  <span className="fb-src__count">{count}</span>
                </Link>
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
