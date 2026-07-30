import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireActiveSpaceId, getActiveSpace } from '../../../../lib/server/auth';
import { getHome, getKinloomServer } from '../../../../lib/server/queries';
import { ApiError } from '../../../../lib/api';
import {
  bodyParagraphs,
  formatKinloomDate,
  isVideoMediaUrl,
  normalizeComments,
  normalizeList,
  type KinloomAuthor,
  type KinloomMedia,
  type TaggableMember,
} from '../../../../lib/kinloom';
import { AudioPlayer } from '../../../components/AudioPlayer';
import HoldButton from './HoldButton';
import KinloomActions from './KinloomActions';
import Comments from './Comments';
import PhotoGallery from './PhotoGallery';

export const dynamic = 'force-dynamic';

type AnyMember = KinloomAuthor | TaggableMember;

function Silhouette({ member, size = 40, idKey }: { member: AnyMember; size?: number; idKey: string }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} className="silhouette">
      <defs><clipPath id={`clip-det-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-det-${idKey})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
    </svg>
  );
}

export default async function KinloomDetailPage({ params }: { params: { id: string } }) {
  const familySpaceId = await requireActiveSpaceId();

  let k;
  try {
    k = await getKinloomServer(familySpaceId, params.id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // /home's user_summary.member_id is authoritative for the current member;
  // family_spaces[].member_id on /me is optional and often absent, so it's
  // only a fallback. A failed /home must not take the page down with it.
  const [home, activeSpace] = await Promise.all([
    getHome(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);
  const myMemberId = home?.userSummary?.member_id || activeSpace?.member_id || null;
  const isAuthor = !!myMemberId && k.author?.member_id === myMemberId;

  const author = k.author;
  const tagged = normalizeList<TaggableMember>(k.tagged_kin);
  const paragraphs = bodyParagraphs(k.body_paragraphs);
  const dateLabel = formatKinloomDate(k.created_at);
  const hold = k.hold ?? { held_by_me: false, count: 0 };
  const comments = normalizeComments(k.comments);
  const photos = normalizeList<KinloomMedia>(k.photos);

  return (
    <div>
      <div className="detail-back">
        <div className="detail-back__inner">
          <Link href="/library" className="link-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Library
          </Link>
          {/*
            Both actions are author-only, and we fail closed: when the
            current member can't be identified nothing is offered rather
            than showing controls the API would reject with a 403.
          */}
          <KinloomActions
            familySpaceId={familySpaceId}
            kinloom={k}
            canEdit={isAuthor}
            canDelete={isAuthor}
          />
        </div>
      </div>

      <article className="detail-article">
        <div className="detail-meta">
          {k.type_label && <span className="badge">{k.type_label}</span>}
          {dateLabel && <span className="detail-meta__date">{dateLabel}</span>}
        </div>

        <h1 className="detail-title">{k.title || 'Untitled'}</h1>

        {author && (
          <div className="detail-author">
            <Silhouette member={author} size={44} idKey={author.member_id} />
            <div>
              <p className="detail-author__line">Kept by <strong>{author.name}</strong></p>
              {(author.role_label || author.kin_term) && (
                <p className="detail-author__role">{author.role_label ?? author.kin_term}</p>
              )}
            </div>
          </div>
        )}

        {photos.length > 0 ? (
          <PhotoGallery photos={photos} />
        ) : k.photo?.url && (
          <figure className="detail-photo">
            {isVideoMediaUrl(k.photo.url) ? (
              <video src={k.photo.url} controls playsInline preload="metadata" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={k.photo.url} alt="" />
            )}
          </figure>
        )}

        {k.audio?.url && (
          <AudioPlayer
            src={k.audio.url}
            title={`${author?.name.split(' ')[0] ?? 'Voice'}\u2019s voice`}
            transcript={k.audio.transcript_text}
            fallbackDurationSeconds={
              k.audio.duration_seconds != null ? Number(k.audio.duration_seconds) || null : null
            }
          />
        )}

        <div className="detail-body">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {tagged.length > 0 && (
          <div className="detail-tagged">
            <p className="eyebrow">For</p>
            <div className="detail-tagged__row">
              {tagged.map(m => (
                <div key={m.member_id} className="detail-tagged__chip">
                  <Silhouette member={m} size={28} idKey={m.member_id} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-actions">
          <HoldButton
            familySpaceId={familySpaceId}
            kinloomId={k.ulid}
            initialHeldByMe={hold.held_by_me}
            initialCount={hold.count}
          />
          <Link href="/create" className="btn-outline btn-outline--sm">Reply with a kinloom</Link>
        </div>

        <Comments
          familySpaceId={familySpaceId}
          kinloomId={k.ulid}
          initialComments={comments}
          currentMemberId={myMemberId}
        />
      </article>
    </div>
  );
}
