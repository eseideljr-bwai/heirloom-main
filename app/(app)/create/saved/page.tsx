'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function RadialBullet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.25" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.45" />
      <circle cx="10" cy="10" r="2.5" fill="#556b5b" opacity="0.75" />
    </svg>
  );
}

export default function CreateSavedPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kinloom-saved');
      if (saved) {
        const d = JSON.parse(saved);
        setTitle(d.title || '');
        localStorage.removeItem('kinloom-saved');
        localStorage.removeItem('kinloom-draft');
        localStorage.removeItem('kinloom-conversation');
      }
    } catch {}
  }, []);

  return (
    <div style={{ padding: '96px 80px', maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="eyebrow">Saved</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
        <span style={{ marginTop: 14, flexShrink: 0 }}>
          <RadialBullet size={16} />
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 52, lineHeight: 1.1, margin: 0, color: '#1a1a1a' }}>
          Kept.
        </h1>
      </div>
      <p style={{ fontSize: 18, color: 'rgba(26,26,26,0.65)', margin: '0 0 36px', lineHeight: 1.65, paddingLeft: 34, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
        {title ? <>&ldquo;{title}&rdquo; is in your library now.</> : <>Your kinloom is in your library now.</>}
        {' '}It will be there whenever someone needs it.
      </p>
      <div style={{ display: 'flex', gap: 12, paddingLeft: 34 }}>
        <button onClick={() => router.push('/library')} style={{ padding: '12px 24px', background: '#556b5b', color: '#fdfcfa', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
          Go to library
        </button>
        <button onClick={() => router.push('/create')} style={{ padding: '12px 20px', background: 'transparent', color: 'rgba(26,26,26,0.65)', border: '1px solid #d4d2cc', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>
          Create another
        </button>
      </div>
    </div>
  );
}
