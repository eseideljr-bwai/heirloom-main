'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { getActiveFamilySpaceId } from '../../../../lib/auth';
import {
  bodyParagraphs,
  formatKinloomDate,
  getKinloom,
  normalizeList,
  toggleHold,
  type Kinloom,
  type KinloomAuthor,
  type TaggableMember,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';

type AnyMember = KinloomAuthor | TaggableMember;

function Silhouette({ member, size = 40, idKey }: { member: AnyMember; size?: number; idKey: string }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
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

function NotFoundBlock() {
  return (
    <div style={{ padding: '48px' }}>
      <Link href="/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none', marginBottom: 24 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Library
      </Link>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.5)' }}>
        Kinloom not found.
      </p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div style={{ padding: '48px' }}>
      <p className="create-banner create-banner--muted" style={{ display: 'inline-block' }}>Loading kinloom…</p>
    </div>
  );
}

export default function KinloomDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const familySpaceId = getActiveFamilySpaceId(user);

  const [kinloom, setKinloom] = useState<Kinloom | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [holdState, setHoldState] = useState<{ held_by_me: boolean; count: number }>({ held_by_me: false, count: 0 });
  const [togglingHold, setTogglingHold] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!familySpaceId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    (async () => {
      try {
        const k = await getKinloom(familySpaceId, params.id);
        if (cancelled) return;
        setKinloom(k);
        setHoldState(k.hold ?? { held_by_me: false, count: 0 });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not load this kinloom.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, familySpaceId, params.id]);

  if (loading || authLoading) return <LoadingBlock />;
  if (notFound || !kinloom) return <NotFoundBlock />;

  const k = kinloom;
  const author = k.author;
  const tagged = normalizeList<TaggableMember>(k.tagged_kin);
  const paragraphs = bodyParagraphs(k.body_paragraphs);
  const dateLabel = formatKinloomDate(k.created_at);

  const onToggleHold = async () => {
    if (!familySpaceId || togglingHold) return;
    setTogglingHold(true);
    try {
      const next = await toggleHold(familySpaceId, k.ulid);
      setHoldState(next);
    } catch {
      // best-effort; ignore for now
    } finally {
      setTogglingHold(false);
    }
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #d4d2cc', padding: '20px 0', marginBottom: 48 }}>
        <div style={{ padding: '0 48px', maxWidth: 760 }}>
          <Link href="/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Library
          </Link>
        </div>
      </div>

      <article style={{ padding: '0 48px 80px', maxWidth: 720 }}>
        {error && (
          <p className="create-banner create-banner--error">{error}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {k.type_label && (
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
              {k.type_label}
            </span>
          )}
          {dateLabel && <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>{dateLabel}</span>}
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 52, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-0.005em', color: '#1a1a1a' }}>
          {k.title}
        </h1>

        {author && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid #d4d2cc' }}>
            <Silhouette member={author} size={44} idKey={author.member_id} />
            <div>
              <p style={{ margin: 0, fontSize: 14, color: '#1a1a1a' }}>
                Kept by <strong style={{ fontWeight: 500 }}>{author.name}</strong>
              </p>
              {(author.role_label || author.kin_term) && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
                  {author.role_label ?? author.kin_term}
                </p>
              )}
            </div>
          </div>
        )}

        {k.photo?.url && (
          <figure style={{ margin: '0 0 32px' }}>
            <div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: '#f5f4f1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={k.photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </figure>
        )}

        {k.audio?.url && (
          <div style={{ background: 'rgba(85,107,91,0.05)', border: '1px solid rgba(85,107,91,0.20)', borderRadius: 12, padding: 20, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setPlaying(p => !p)}
              style={{ width: 44, height: 44, borderRadius: '50%', background: '#556b5b', border: 'none', color: '#fdfcfa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {playing
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              }
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                {author?.name.split(' ')[0] ?? 'Voice'}&apos;s voice
              </p>
              {k.audio.transcript_text && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {k.audio.transcript_text}
                </p>
              )}
            </div>
            {k.audio.duration_seconds != null && (
              <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
                {Math.round(Number(k.audio.duration_seconds) || 0)}s
              </span>
            )}
          </div>
        )}

        <div>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.75, color: '#1a1a1a', margin: '0 0 24px' }}>
              {p}
            </p>
          ))}
        </div>

        {tagged.length > 0 && (
          <div style={{ paddingTop: 28, marginTop: 32, borderTop: '1px solid #d4d2cc' }}>
            <p className="eyebrow" style={{ marginBottom: 14 }}>For</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {tagged.map(m => (
                <div key={m.member_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: '#f5f4f1', borderRadius: 9999 }}>
                  <Silhouette member={m} size={28} idKey={m.member_id} />
                  <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.8)' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 48, paddingTop: 24, borderTop: '1px solid #d4d2cc', flexWrap: 'wrap' }}>
          <button
            onClick={onToggleHold}
            disabled={togglingHold}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: holdState.held_by_me ? 'rgba(85,107,91,0.10)' : 'transparent', color: holdState.held_by_me ? '#556b5b' : 'rgba(26,26,26,0.65)', border: `1px solid ${holdState.held_by_me ? 'rgba(85,107,91,0.40)' : '#d4d2cc'}`, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: togglingHold ? 'not-allowed' : 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            {holdState.held_by_me ? 'Holding' : 'Hold a moment'}
            {holdState.count > 0 && <span style={{ fontSize: 12, opacity: 0.7 }}>· {holdState.count}</span>}
          </button>
          <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'rgba(26,26,26,0.65)', border: '1px solid #d4d2cc', padding: '8px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
            Reply with a kinloom
          </Link>
        </div>
      </article>
    </div>
  );
}
