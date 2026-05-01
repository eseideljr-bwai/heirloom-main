'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MEMBERS, MEMBER_MAP } from '../../../lib/mock-data';
import { KINLOOM_TYPE_MAP } from '../../../lib/kinloom-types';

type Step = 1 | 2 | 3;
type Visibility = 'family' | 'private';

function StepIndicator({ current, total = 3 }: { current: Step; total?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i + 1 === current ? '#556b5b' : i + 1 < current ? 'rgba(85,107,91,0.20)' : '#f5f4f1',
            border: `1px solid ${i + 1 === current ? '#556b5b' : i + 1 < current ? 'rgba(85,107,91,0.30)' : '#d4d2cc'}`,
            fontSize: 11, fontWeight: 500,
            color: i + 1 === current ? '#fdfcfa' : i + 1 < current ? '#556b5b' : 'rgba(26,26,26,0.4)',
          }}>
            {i + 1 < current ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ width: 24, height: 1, background: i + 1 < current ? 'rgba(85,107,91,0.30)' : '#d4d2cc' }} />
          )}
        </div>
      ))}
      <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', marginLeft: 4 }}>
        Step {current} of {total}
      </span>
    </div>
  );
}

export default function CreateTypePage({ params }: { params: { type: string } }) {
  const router = useRouter();
  const typeData = KINLOOM_TYPE_MAP[params.type];
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hasVoice, setHasVoice] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [taggedKin, setTaggedKin] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('family');

  if (!typeData) {
    return (
      <div style={{ padding: '48px' }}>
        <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.7)' }}>Unknown kinloom type.</p>
        <Link href="/create" style={{ color: '#556b5b', fontSize: 14 }}>← Back to create</Link>
      </div>
    );
  }

  const handleSave = () => {
    router.push('/library');
  };

  const toggleKin = (id: string) => {
    setTaggedKin(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const otherMembers = MEMBERS.filter(m => !m.isMe);

  return (
    <div style={{ padding: '48px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #d4d2cc', paddingBottom: 20, marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Create
          </Link>
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Step 1: Prompt */}
      {step === 1 && (
        <div style={{ maxWidth: 640 }}>
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b', marginBottom: 20 }}>
            {typeData.label}
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 42, lineHeight: 1.2, margin: '0 0 20px', color: '#1a1a1a' }}>
            {typeData.definition}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(26,26,26,0.65)', margin: '0 0 36px' }}>
            Take a moment with this question. There's no rush.
          </p>

          <div className="prompt-block" style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 20, lineHeight: 1.7 }}>
              &ldquo;{typeData.prompt}&rdquo;
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setStep(2)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '13px 28px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Begin writing
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 12 L10 8 L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', padding: '13px 24px', borderRadius: 8, fontSize: 15, textDecoration: 'none' }}>
              Choose different type
            </Link>
          </div>
        </div>
      )}

      {/* Step 2: Compose */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, alignItems: 'flex-start' }}>
          <div>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b', marginBottom: 16 }}>
              {typeData.label}
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, margin: '0 0 24px', color: '#1a1a1a' }}>
              Write your kinloom
            </h2>

            <div style={{ marginBottom: 20 }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Give it a title…"
                style={{ width: '100%', padding: '13px 16px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 17, fontFamily: 'var(--font-serif)', outline: 'none', color: '#1a1a1a', boxSizing: 'border-box' }}
              />
            </div>

            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write here. Say what matters. There is no wrong answer."
              rows={14}
              style={{ width: '100%', padding: '16px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.75, resize: 'vertical', outline: 'none', color: '#1a1a1a', boxSizing: 'border-box' }}
            />

            {/* Attachment options */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setHasVoice(v => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: hasVoice ? 'rgba(85,107,91,0.10)' : 'transparent', color: hasVoice ? '#556b5b' : 'rgba(26,26,26,0.55)', border: `1px solid ${hasVoice ? 'rgba(85,107,91,0.30)' : '#d4d2cc'}` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
                {hasVoice ? 'Voice added' : 'Add voice'}
              </button>
              <button
                onClick={() => setHasPhoto(p => !p)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: hasPhoto ? 'rgba(85,107,91,0.10)' : 'transparent', color: hasPhoto ? '#556b5b' : 'rgba(26,26,26,0.55)', border: `1px solid ${hasPhoto ? 'rgba(85,107,91,0.30)' : '#d4d2cc'}` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                {hasPhoto ? 'Photo added' : 'Add photo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button
                onClick={() => body.trim() && setStep(3)}
                disabled={!body.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '13px 28px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: body.trim() ? 'pointer' : 'not-allowed', opacity: body.trim() ? 1 : 0.5 }}
              >
                Continue
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 12 L10 8 L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                onClick={() => setStep(1)}
                style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', padding: '13px 22px', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Back
              </button>
            </div>
          </div>

          {/* Tips sidebar */}
          <div style={{ position: 'sticky', top: 48 }}>
            <div style={{ background: 'rgba(85,107,91,0.04)', border: '1px solid rgba(85,107,91,0.15)', borderRadius: 12, padding: '20px 18px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#556b5b' }}>Writing tips</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  "Write to a specific person — it makes the voice more personal.",
                  "Include a sensory detail: a smell, a sound, a texture. It makes memories last.",
                  "It doesn't need to be long. A paragraph can hold a lifetime.",
                  "Say what you've never found the right moment to say.",
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#556b5b', opacity: 0.5, flexShrink: 0, marginTop: 7 }} />
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(26,26,26,0.65)' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, background: '#f5f4f1', borderRadius: 10, padding: '16px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)' }}>The prompt</p>
              <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic', lineHeight: 1.65, color: 'rgba(26,26,26,0.6)' }}>
                &ldquo;{typeData.prompt}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Tag & save */}
      {step === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, margin: '0 0 8px', color: '#1a1a1a' }}>
              Almost there.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.6)', margin: '0 0 36px' }}>
              Who is this kinloom for? And who should be able to see it?
            </p>

            {/* Tag kin */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '0 0 12px' }}>Tag family members</p>
              <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', margin: '0 0 14px' }}>Select anyone this kinloom is written to or about.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {otherMembers.map(m => {
                  const isTagged = taggedKin.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleKin(m.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 10px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, border: `1px solid ${isTagged ? 'rgba(85,107,91,0.40)' : '#d4d2cc'}`, background: isTagged ? 'rgba(85,107,91,0.08)' : '#fff', color: isTagged ? '#556b5b' : 'rgba(26,26,26,0.7)' }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: m.tone + '33', border: `1px solid ${m.tone}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: m.tone, fontWeight: 600 }}>
                        {m.initials}
                      </span>
                      {m.name.split(' ')[0]}
                      {isTagged && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '0 0 12px' }}>Visibility</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { id: 'family', label: 'Family space', desc: 'All family members can read this.' },
                  { id: 'private', label: 'Only me', desc: 'Just for your personal record.' },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVisibility(v.id as 'family' | 'private')}
                    style={{ flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: `1px solid ${visibility === v.id ? 'rgba(85,107,91,0.40)' : '#d4d2cc'}`, background: visibility === v.id ? 'rgba(85,107,91,0.06)' : '#fff' }}
                  >
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: visibility === v.id ? '#556b5b' : '#1a1a1a' }}>{v.label}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleSave}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '13px 28px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Save kinloom
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </button>
              <button
                onClick={() => setStep(2)}
                style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', padding: '13px 22px', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Back
              </button>
            </div>
          </div>

          {/* Preview sidebar */}
          <div style={{ position: 'sticky', top: 48 }}>
            <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '20px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>Preview</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
                  {typeData.label}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 10px', color: '#1a1a1a', lineHeight: 1.3 }}>
                {title || <span style={{ color: 'rgba(26,26,26,0.3)' }}>Untitled</span>}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(26,26,26,0.65)', margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {body || <span style={{ color: 'rgba(26,26,26,0.3)' }}>Your writing will appear here…</span>}
              </p>
              {(hasVoice || hasPhoto) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {hasVoice && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(26,26,26,0.45)' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
                      Voice
                    </span>
                  )}
                  {hasPhoto && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(26,26,26,0.45)' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      Photo
                    </span>
                  )}
                </div>
              )}
              {taggedKin.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(26,26,26,0.4)' }}>For</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {taggedKin.map(id => {
                      const m = MEMBER_MAP[id];
                      return m ? (
                        <span key={id} style={{ fontSize: 12, color: 'rgba(26,26,26,0.65)', background: '#f5f4f1', borderRadius: 9999, padding: '2px 8px' }}>
                          {m.name.split(' ')[0]}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e8e6e1' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(26,26,26,0.4)' }}>
                  {visibility === 'family' ? '🌿 Shared with your family' : '🔒 Private to you'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
