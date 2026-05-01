'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KINLOOM_MAP, MEMBER_MAP, type Member } from '../../../lib/mock-data';
import { KINLOOM_TYPE_MAP } from '../../../lib/kinloom-types';

function Silhouette({ member, size = 40 }: { member: Member; size?: number }) {
  const { gender = 'n', tone = '#a39376', isMe } = member;
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-det-${member.id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-det-${member.id})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
      {isMe && <circle cx="40" cy="40" r="38" fill="none" stroke="#556b5b" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.9" />}
    </svg>
  );
}

export default function KinloomDetailPage({ params }: { params: { id: string } }) {
  const [playing, setPlaying] = useState(false);
  const k = KINLOOM_MAP[params.id];

  if (!k) {
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

  const type = KINLOOM_TYPE_MAP[k.type];
  const author = MEMBER_MAP[k.author];
  const tagged = k.taggedKin.map(id => MEMBER_MAP[id]).filter(Boolean) as Member[];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {type && (
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
              {type.label}
            </span>
          )}
          <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>{k.date}</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 52, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-0.005em', color: '#1a1a1a' }}>
          {k.title}
        </h1>

        {author && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid #d4d2cc' }}>
            <Silhouette member={author} size={44} />
            <div>
              <p style={{ margin: 0, fontSize: 14, color: '#1a1a1a' }}>
                Kept by <strong style={{ fontWeight: 500 }}>{author.name}</strong>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>{author.role}</p>
            </div>
          </div>
        )}

        {k.hasPhoto && author && (
          <figure style={{ margin: '0 0 32px' }}>
            <div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: `linear-gradient(140deg, ${author.tone}88, ${author.tone}33)` }}>
              <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
                <ellipse cx="160" cy="170" rx="50" ry="70" fill={author.tone} opacity="0.55" />
                <path d="M 0 300 C 80 220, 200 200, 240 200 C 280 200, 360 220, 400 300 Z" fill={author.tone} opacity="0.4" />
                <circle cx="320" cy="80" r="22" fill="#fff" opacity="0.35" />
              </svg>
            </div>
          </figure>
        )}

        {k.hasAudio && author && (
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
                {author.name.split(' ')[0]}&apos;s voice
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: 18, marginTop: 6 }}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const h = (Math.sin(i * 0.6) * 0.5 + 0.5) * 14 + 2;
                  const elapsed = playing && (i / 60) < 0.35;
                  return (
                    <span key={i} style={{ width: 2, height: h, borderRadius: 1, background: elapsed ? '#556b5b' : '#a39376', opacity: elapsed ? 0.85 : 0.45 }} />
                  );
                })}
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>02:14</span>
          </div>
        )}

        <div>
          {k.body.split('\n\n').map((p, i) => (
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
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: '#f5f4f1', borderRadius: 9999 }}>
                  <Silhouette member={m} size={28} />
                  <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.8)' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 48, paddingTop: 24, borderTop: '1px solid #d4d2cc', flexWrap: 'wrap' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'rgba(26,26,26,0.65)', border: '1px solid #d4d2cc', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            Hold a moment
          </button>
          <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'rgba(26,26,26,0.65)', border: '1px solid #d4d2cc', padding: '8px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
            Reply with a kinloom
          </Link>
        </div>
      </article>
    </div>
  );
}
