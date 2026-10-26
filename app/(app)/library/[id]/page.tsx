import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import { ApiError } from '../../../../lib/api';
import {
  formatKinloomDate,
  roomKey,
  type PersonOrNameOnly,
} from '../../../../lib/kinloom';
import { AudioPlayer } from '../../../components/AudioPlayer';
import HoldButton from './HoldButton';
import KinloomActions from './KinloomActions';
import Comments from './Comments';
import PhotoGallery from './PhotoGallery';

export const dynamic = 'force-dynamic';

type AnyMember = { name: string; gender?: string; tone?: string };

/** A person card carries a face; a name-only author (outside your people) does not. */
function personOf(p: PersonOrNameOnly): { member: AnyMember; role: string | null; key: string } {
  if ('id' in p) return { member: p, role: p.label, key: p.id };
  return { member: { name: p.name }, role: null, key: `name-${p.name}` };
}

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

export default async function KinloomDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { room?: string };
}) {
  // A room is only ever one of the kinloom's own `rooms`; the API rejects
  // anything else, so a stale or hand-edited value simply falls back.
  const roomParam = /^(home|space):[0-9A-Za-z]{26}$/.test(searchParams?.room ?? '')
    ? searchParams!.room
    : undefined;

  const kinloomReq = serverKinloomApi
    .get('/kinlooms/{kinloom}', {
      path: { kinloom: params.id },
      query: roomParam ? { room: roomParam } : {},
    })
    .then((data) => ({ data }), (error: unknown) => ({ error }));
  await requireHome();
  const result = await kinloomReq;
  if ('error' in result) {
    if (result.error instanceof ApiError && result.error.status === 404) notFound();
    throw result.error;
  }
  const k = result.data;

  const { member: author, role: authorRole, key: authorKey } = personOf(k.author);
  const dateLabel = formatKinloomDate(k.created_at);
  const visualMedia = k.media.filter(m => m.type === 'image' || m.type === 'video');
  const audio = k.media.filter(m => m.type === 'audio');
  const documents = k.media.filter(m => m.type === 'document');
  const authorFirst = author.name.split(' ')[0] || 'Voice';
  const engagement = k.engagement;

  return (
    <div>
      <div className="detail-back">
        <div className="detail-back__inner">
          <Link href="/vault" className="link-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Vault
          </Link>
          {/* Author-only actions: the API says who may, never the client. */}
          <KinloomActions
            kinloom={k}
            canEdit={k.can_edit}
            canDelete={k.can_delete}
            canPublish={k.can_edit && (k.status === 'draft' || k.can_publish)}
          />
        </div>
      </div>

      <article className="detail-article">
        <div className="detail-meta">
          <span className="badge">{k.type.label}</span>
          {k.status === 'draft' && <span className="badge">Draft</span>}
          {dateLabel && <span className="detail-meta__date">{dateLabel}</span>}
          {k.occurred_label && <span className="detail-meta__date">{k.occurred_label}</span>}
          {k.place && <span className="detail-meta__date">{k.place}</span>}
        </div>

        <h1 className="detail-title">{k.title || 'Untitled'}</h1>

        <div className="detail-author">
          <Silhouette member={author} size={44} idKey={authorKey} />
          <div>
            <p className="detail-author__line">Kept by <strong>{author.name}</strong></p>
            {authorRole && <p className="detail-author__role">{authorRole}</p>}
          </div>
        </div>

        {k.audience.length > 0 ? (
          <p className="detail-meta__date">
            Published to {k.audience.map(a => (a.when === 'on_passing' ? `${a.name} (after I pass)` : a.name)).join(' · ')}
          </p>
        ) : k.can_edit ? (
          <p className="detail-meta__date">{k.status === 'draft' ? 'Draft. Only you can see it.' : 'Private. Only you can see it.'}</p>
        ) : null}

        {visualMedia.length > 0 && <PhotoGallery photos={visualMedia} />}

        {audio.map(a => (
          <AudioPlayer
            key={a.id}
            src={a.url}
            title={`${authorFirst}\u2019s voice`}
            transcript={a.transcript_text}
            fallbackDurationSeconds={a.duration_seconds}
          />
        ))}

        <div className="detail-body">
          {k.body_paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {documents.length > 0 && (
          <div className="detail-tagged">
            <p className="eyebrow">Attachments</p>
            <ul>
              {documents.map(d => (
                <li key={d.id}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer">{d.filename || 'Attachment'}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {k.tags.length > 0 && (
          <div className="detail-tagged">
            <p className="eyebrow">For</p>
            <div className="detail-tagged__row">
              {k.tags.map(m => (
                <div key={m.id} className="detail-tagged__chip">
                  <Silhouette member={m} size={28} idKey={m.id} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {engagement && (
          <>
            {k.rooms.length > 1 && (
              <nav className="detail-tagged__row" aria-label="Conversation room">
                {k.rooms.map(r => (
                  <Link
                    key={roomKey(r)}
                    href={`/library/${k.id}?room=${roomKey(r)}`}
                    className={`vis-chip${roomKey(r) === roomKey(engagement.room) ? ' is-active' : ''}`}
                  >
                    {r.name}
                  </Link>
                ))}
              </nav>
            )}

            <div className="detail-actions">
              <HoldButton
                key={`hold-${roomKey(engagement.room)}`}
                kinloomId={k.id}
                room={engagement.room}
                initialHeldByMe={engagement.hold.held_by_me}
                initialCount={engagement.hold.count}
                readOnly={engagement.read_only}
              />
              <Link href="/create" className="btn-outline btn-outline--sm">Reply with a kinloom</Link>
            </div>

            <Comments
              key={`comments-${roomKey(engagement.room)}`}
              kinloomId={k.id}
              room={engagement.room}
              initialComments={engagement.comments.data}
              total={engagement.comments.meta.total}
              readOnly={engagement.read_only}
            />
          </>
        )}
      </article>
    </div>
  );
}
