'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { getActiveFamilySpaceId } from '../../../lib/auth';
import {
  bodyParagraphs,
  formatKinloomDate,
  getLibrary,
  type KinloomAuthor,
  type LibraryRow,
} from '../../../lib/kinloom';
import { KINLOOM_TYPES } from '../../lib/kinloom-types';
import { ApiError } from '../../../lib/api';

function Silhouette({ member, size = 22, idKey }: { member: KinloomAuthor; size?: number; idKey: string }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-lib-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-lib-${idKey})`}>
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

function rowExcerpt(row: LibraryRow): string {
  if (row.excerpt) return row.excerpt;
  if (row.body_paragraphs) {
    const first = bodyParagraphs(row.body_paragraphs)[0] ?? '';
    return first.length > 180 ? `${first.slice(0, 180).trim()}…` : first;
  }
  return '';
}

function hasAudio(row: LibraryRow): boolean {
  return Boolean(row.has_audio ?? row.audio?.url);
}
function hasPhoto(row: LibraryRow): boolean {
  return Boolean(row.has_photo ?? row.photo?.url);
}

function KinloomCard({ row }: { row: LibraryRow }) {
  const excerpt = rowExcerpt(row);
  const date = formatKinloomDate(row.created_at);
  return (
    <Link href={`/library/${row.ulid}`} style={{ display: 'block', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: 24, textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {row.type_label && (
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
            {row.type_label}
          </span>
        )}
        {hasAudio(row) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>}
        {hasPhoto(row) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
      </div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 8px', color: '#1a1a1a', lineHeight: 1.25 }}>
        {row.title || 'Untitled'}
      </h3>
      {excerpt && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(26,26,26,0.65)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {excerpt}
        </p>
      )}
      {row.author && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
          <Silhouette member={row.author} size={22} idKey={`${row.ulid}-${row.author.member_id}`} />
          <span>{row.author.name}</span>
          {date && <><span>·</span><span>{date}</span></>}
        </div>
      )}
    </Link>
  );
}

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const familySpaceId = getActiveFamilySpaceId(user);

  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!familySpaceId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await getLibrary(familySpaceId);
        if (cancelled) return;
        setRows(res.kinlooms);
        setTotal(res.total);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load your library.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, familySpaceId]);

  const filters = useMemo(() => ['All', ...KINLOOM_TYPES.map(t => t.label)], []);

  const contributors = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach(r => { if (r.author?.member_id) ids.add(r.author.member_id); });
    return ids.size;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchType = filter === 'All' || r.type_label === filter;
      const q = query.trim().toLowerCase();
      const matchQ = !q
        || (r.title || '').toLowerCase().includes(q)
        || rowExcerpt(r).toLowerCase().includes(q);
      return matchType && matchQ;
    });
  }, [rows, filter, query]);

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
          {total || rows.length} pieces — {contributors} contributors.
        </p>
      </div>

      {error && (
        <p className="create-banner create-banner--error">{error}</p>
      )}

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

      {loading ? (
        <div className="empty-card">
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.45)', margin: 0 }}>
            Loading your library…
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-card">
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.45)', margin: '0 0 14px' }}>
            Your library is empty.
          </p>
          <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#556b5b', fontSize: 14, textDecoration: 'none' }}>
            Write your first kinloom →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.45)', margin: 0 }}>
            Nothing matches that yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map(row => <KinloomCard key={row.ulid} row={row} />)}
        </div>
      )}
    </div>
  );
}
