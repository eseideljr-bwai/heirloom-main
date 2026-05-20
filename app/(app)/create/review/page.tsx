'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MEMBERS } from '../../../lib/mock-data';

const DRAFT_KEY = 'kinloom-draft';

type Visibility = 'family' | 'private';

interface Draft {
  title: string;
  body: string;
  hasVoice: boolean;
  hasPhoto: boolean;
  hasDocument: boolean;
  path: string;
}

function StepIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {[1, 2, 3].map((n, i) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: n < 3 ? 'rgba(85,107,91,0.18)' : '#556b5b',
            border: `1px solid ${n < 3 ? 'rgba(85,107,91,0.28)' : '#556b5b'}`,
            fontSize: 11,
            fontWeight: 500,
            color: n < 3 ? '#556b5b' : '#fdfcfa',
            flexShrink: 0,
          }}>
            {n < 3 ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : n}
          </div>
          {i < 2 && (
            <div style={{ width: 24, height: 1, background: 'rgba(85,107,91,0.28)' }} />
          )}
        </div>
      ))}
      <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', marginLeft: 4 }}>
        Step 3 of 3
      </span>
    </div>
  );
}

function KinChip({
  name,
  initials,
  tone,
  selected,
  onToggle,
}: {
  name: string;
  initials: string;
  tone: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px 8px 10px',
        borderRadius: 9999,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        border: `1px solid ${selected ? 'rgba(85,107,91,0.40)' : hover ? 'rgba(26,26,26,0.2)' : '#d4d2cc'}`,
        background: selected ? 'rgba(85,107,91,0.08)' : hover ? 'rgba(26,26,26,0.02)' : '#fff',
        color: selected ? '#556b5b' : 'rgba(26,26,26,0.7)',
        transition: 'border-color 160ms, background 160ms, color 160ms',
      }}
    >
      <span style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: tone + '33',
        border: `1px solid ${tone}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        color: tone,
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {initials}
      </span>
      {name.split(' ')[0]}
      {selected && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

export default function CreateReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ title: '', body: '', hasVoice: false, hasPhoto: false, hasDocument: false, path: 'writing' });
  const [taggedKin, setTaggedKin] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('family');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft(JSON.parse(saved));
    } catch {}
  }, []);

  const otherMembers = MEMBERS.filter(m => !m.isMe);

  const toggleKin = (id: string) =>
    setTaggedKin(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      title: draft.title || 'Untitled kinloom',
      body: draft.body,
      attachments: {
        voice: draft.hasVoice,
        photo: draft.hasPhoto,
        document: draft.hasDocument,
      },
      taggedKin,
      visibility,
      path: draft.path,
      createdAt: new Date().toISOString(),
    };

    // TODO: replace with real API call once kinloom create endpoint is available
    console.log('Saving kinloom:', payload);

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}

    // TODO: route to kinloom detail page once /library/[id] supports new records
    router.push('/library');
  };

  const bodyPreview = draft.body
    ? draft.body.slice(0, 180) + (draft.body.length > 180 ? '…' : '')
    : '';

  return (
    <div style={{ padding: '48px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #d4d2cc', paddingBottom: 20, marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/create/write"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Create
          </Link>
          <StepIndicator />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40, alignItems: 'flex-start' }}>

        {/* Left: settings */}
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.15,
            margin: '0 0 8px',
            color: '#1a1a1a',
          }}>
            Almost there.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.6)', margin: '0 0 40px' }}>
            Who is this kinloom for? And who should be able to see it?
          </p>

          {/* Tag kin */}
          <div style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '0 0 6px' }}>
              Tag family members
            </p>
            <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', margin: '0 0 16px' }}>
              Select anyone this kinloom is written to or about.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {otherMembers.map(m => (
                <KinChip
                  key={m.id}
                  name={m.name}
                  initials={m.initials}
                  tone={m.tone}
                  selected={taggedKin.includes(m.id)}
                  onToggle={() => toggleKin(m.id)}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '0 0 12px' }}>
              Visibility
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {([
                { id: 'family' as const, label: 'Family space', desc: 'All family members can read this.' },
                { id: 'private' as const, label: 'Only me', desc: 'Just for your personal record.' },
              ]).map(v => (
                <button
                  key={v.id}
                  onClick={() => setVisibility(v.id)}
                  style={{
                    flex: 1,
                    padding: '16px 18px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    border: `1px solid ${visibility === v.id ? 'rgba(85,107,91,0.40)' : '#d4d2cc'}`,
                    background: visibility === v.id ? 'rgba(85,107,91,0.06)' : '#fff',
                    transition: 'border-color 160ms, background 160ms',
                  }}
                >
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: visibility === v.id ? '#556b5b' : '#1a1a1a' }}>
                    {v.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>
                    {v.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#556b5b',
                color: '#fdfcfa',
                border: 'none',
                padding: '13px 28px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 180ms',
              }}
            >
              {saving ? 'Saving…' : 'Save kinloom'}
              {!saving && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <button
              onClick={() => router.push('/create/write')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'transparent',
                color: 'rgba(26,26,26,0.6)',
                border: '1px solid #d4d2cc',
                padding: '13px 22px',
                borderRadius: 8,
                fontSize: 15,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>

        {/* Right: preview card */}
        <div style={{ position: 'sticky', top: 48 }}>
          <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '22px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>
              Preview
            </p>

            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b', marginBottom: 12 }}>
              Story
            </span>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 19, margin: '0 0 10px', color: '#1a1a1a', lineHeight: 1.3 }}>
              {draft.title || <span style={{ color: 'rgba(26,26,26,0.3)' }}>Untitled kinloom</span>}
            </h3>

            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(26,26,26,0.6)', margin: '0 0 16px', minHeight: 60 }}>
              {bodyPreview || <span style={{ color: 'rgba(26,26,26,0.3)', fontStyle: 'italic' }}>Your kinloom preview will appear here.</span>}
            </p>

            {(draft.hasVoice || draft.hasPhoto || draft.hasDocument) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {draft.hasVoice && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(26,26,26,0.45)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="17" x2="12" y2="22" />
                    </svg>
                    Voice
                  </span>
                )}
                {draft.hasPhoto && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(26,26,26,0.45)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    Photo
                  </span>
                )}
                {draft.hasDocument && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(26,26,26,0.45)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Document
                  </span>
                )}
              </div>
            )}

            {taggedKin.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(26,26,26,0.4)' }}>For</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {taggedKin.map(id => {
                    const m = MEMBERS.find(x => x.id === id);
                    return m ? (
                      <span key={id} style={{ fontSize: 12, color: 'rgba(26,26,26,0.65)', background: '#f5f4f1', borderRadius: 9999, padding: '2px 8px' }}>
                        {m.name.split(' ')[0]}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div style={{ paddingTop: 14, borderTop: '1px solid #e8e6e1' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,26,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: visibility === 'family' ? '#556b5b' : '#d4d2cc', flexShrink: 0, display: 'inline-block' }} />
                {visibility === 'family' ? 'Shared with your family' : 'Only visible to you'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
