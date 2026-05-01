'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingFirstKinloom() {
  const [content, setContent] = useState('');
  const router = useRouter();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/home');
  };

  return (
    <div style={{ maxWidth: 640, margin: '64px auto', padding: '0 32px' }}>
      <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 16px' }}>
        Your first kinloom
      </p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.15, margin: '0 0 8px', color: '#1a1a1a' }}>
        Capture something worth preserving.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: '0 0 40px' }}>
        Start with a story. You can always create more later.
      </p>

      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)' }}>
        {/* Type badge */}
        <div style={{ display: 'inline-block', background: 'rgba(85,107,91,0.10)', color: '#556b5b', borderRadius: 9999, padding: '4px 12px', fontSize: 13, fontWeight: 500, marginBottom: 24 }}>
          Story
        </div>

        {/* Prompt */}
        <div style={{ background: 'rgba(85,107,91,0.05)', borderLeft: '3px solid #556b5b', borderRadius: '0 8px 8px 0', padding: '16px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(26,26,26,0.8)', margin: 0, fontStyle: 'italic' }}>
            "What story from your childhood still shapes who you are?"
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your story here…"
            rows={8}
            style={{ width: '100%', padding: '14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Save kinloom
            </button>
            <button
              type="button"
              onClick={() => router.push('/home')}
              style={{ background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
