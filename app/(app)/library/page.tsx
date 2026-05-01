'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KINLOOMS, MEMBER_MAP, type Kinloom, type Member } from '../../lib/mock-data';
import { KINLOOM_TYPES, KINLOOM_TYPE_MAP } from '../../lib/kinloom-types';

function TypeBadge({ slug }: { slug: string }) {
  const t = KINLOOM_TYPE_MAP[slug];
  if (!t) return null;
  return (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
      {t.label}
    </span>
  );
}

function Silhouette({ member, size = 40 }: { member: Member; size?: number }) {
  const { gender = 'n', tone = '#a39376', isMe } = member;
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-lib-${member.id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-lib-${member.id})`}>
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

function KinloomCard({ kinloom }: { kinloom: Kinloom }) {
  const author = MEMBER_MAP[kinloom.author];
  return (
    <Link href={`/library/${kinloom.id}`} style={{ display: 'block', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: 24, textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <TypeBadge slug={kinloom.type} />
        {kinloom.hasAudio && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>}
        {kinloom.hasPhoto && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
      </div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 8px', color: '#1a1a1a', lineHeight: 1.25 }}>
        {kinloom.title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(26,26,26,0.65)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {kinloom.excerpt}
      </p>
      {author && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
          <Silhouette member={author} size={22} />
          <span>{author.name}</span>
          <span>·</span>
          <span>{kinloom.date}</span>
        </div>
      )}
    </Link>
  );
}

export default function LibraryPage() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = KINLOOMS.filter(k => {
    const t = KINLOOM_TYPE_MAP[k.type];
    const matchType = filter === 'All' || t?.label === filter;
    const matchQ = !query || k.title.toLowerCase().includes(query.toLowerCase()) || k.excerpt.toLowerCase().includes(query.toLowerCase());
    return matchType && matchQ;
  });

  const filters = ['All', ...KINLOOM_TYPES.map(t => t.label)];

  return (
    <div style={{ padding: '48px' }}>
      <div style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Library</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, margin: 0, lineHeight: 1.1, color: '#1a1a1a' }}>
            Your kinlooms
          </h1>
          <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#556b5b', color: '#fdfcfa', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create
          </Link>
        </div>
        <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.65)', margin: '12px 0 0' }}>
          {KINLOOMS.length} pieces — {KINLOOMS.map(k => k.author).filter((v, i, a) => a.indexOf(v) === i).length} contributors.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 480 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(26,26,26,0.4)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, words, or feeling…"
          style={{ width: '100%', padding: '11px 14px 11px 40px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: 9999, fontSize: 13, border: '1px solid transparent', cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? '#556b5b' : '#f5f4f1', color: filter === f ? '#fdfcfa' : 'rgba(26,26,26,0.65)' }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-card">
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.45)', margin: 0 }}>
            Nothing matches that yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map(k => <KinloomCard key={k.id} kinloom={k} />)}
        </div>
      )}
    </div>
  );
}
